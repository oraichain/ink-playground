import * as Comlink from 'comlink';
import { monaco } from 'react-monaco-editor';
import { Uri } from 'monaco-editor/esm/vs/editor/editor.api';

import { WorkerApi } from './wasm.worker';

import { configureLanguage, setTokens, Token } from './configureLanguage';

const modeId = 'ra-rust'; // not "rust" to circumvent conflict

export const startRustAnalyzer = async (uri: Uri) => {
  const model = monaco.editor.getModel(uri);
  if (!model) return;

  monaco.languages.register({
    // language for editor
    id: modeId,
  });
  monaco.languages.register({
    // language for hover info
    id: 'rust',
  });
  const rustConf = await import(
    /* webpackChunkName: "monaco-editor" */ 'monaco-editor/esm/vs/basic-languages/rust/rust'
  );
  monaco.editor.setModelLanguage(model, 'rust');
  monaco.languages.setLanguageConfiguration('rust', rustConf.conf);
  monaco.languages.setMonarchTokensProvider('rust', rustConf.language);
  monaco.languages.setLanguageConfiguration(modeId, rustConf.conf);
  monaco.editor.setTheme('custom-dark');

  const worldState = await Comlink.wrap<WorkerApi>(
    new Worker(new URL('./wasm.worker', import.meta.url), {
      type: 'module',
    })
  ).handlers;

  const allTokens: Array<Token> = [];
  monaco.languages.onLanguage(modeId, configureLanguage(worldState, allTokens));
  const data = await fetch(`./change.json`);
  const textData = await data.text();
  const encoder = new TextEncoder();
  const bufferData = encoder.encode(textData);
  worldState.load(bufferData);

  let timer: NodeJS.Timer;
  async function update() {
    if (!model) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const text = model.getValue();
      const res = await worldState.update(text);
      monaco.editor.setModelMarkers(model, modeId, res.diagnostics);
      allTokens.length = 0;
      allTokens.push(...res.highlights);
      setTokens(allTokens);
    }, 500);
  }

  await update();
  model.onDidChangeContent(update);

  // rust analyzer loaded and diagnostics ready -> switch to rust analyzer
  monaco.editor.setModelLanguage(model, modeId);
};
