import {application} from './application';

declare const require: {
  context(directory: string, useSubdirectories: boolean, regExp: RegExp): any;
};

const controllers = require.context('.', true, /_controller\.(js|ts)$/);
controllers.keys().forEach((filename) => {
  const module = controllers(filename);
  const controllerName = filename
    .replace(/(_controller\.(js|ts))$/, '')
    .replace(/^.*\//, '')
    .replace(/_/g, '-');
  application.register(controllerName, module.default || module);
});

export {application};
