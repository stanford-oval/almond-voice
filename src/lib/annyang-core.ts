//! Adapted for use by Euirim Choi
//! annyang
//! version : 2.5.0
//! author  : Tal Ater @TalAter
//! license : MIT
//! https://www.TalAter.com/annyang/
let commandsList: any[] = [];
const callbacks = {
  start: [],
  error: [],
  end: [],
  result: [],
  resultMatch: [],
  resultNoMatch: [],
  errorNetwork: [],
  errorPermissionBlocked: [],
  errorPermissionDenied: [],
};
let recognition: any;
let debugState = false;

// The command matching code is a modified version of Backbone.Router by Jeremy Ashkenas, under the MIT license.
const optionalParam = /\s*\((.*?)\)\s*/g;
const optionalRegex = /(\(\?:[^)]+\))\?/g;
const namedParam = /(\(\?)?:\w+/g;
const splatParam = /\*\w+/g;
const escapeRegExp = /[-{}[\]+?.,\\^$|#]/g;
const commandToRegExp = (command: string): RegExp => {
  const procCommand = command
    .replace(escapeRegExp, '\\$&')
    .replace(optionalParam, '(?:$1)?')
    .replace(namedParam, function(match, optional) {
      return optional ? match : '([^\\s]+)';
    })
    .replace(splatParam, '(.*?)')
    .replace(optionalRegex, '\\s*$1?\\s*');
  return new RegExp(`^${procCommand}$`, 'i');
};

// This method receives an array of callbacks to iterate over, and invokes each of them
const invokeCallbacks = (cbacks: any[], ...ls: any[]): void => {
  const args = Array.prototype.slice.call(ls, 1);
  cbacks.forEach(cb => cb.callback.apply(cb.context, args));
};

const isInitialized = (): boolean => {
  return recognition !== undefined;
};

// method for logging in developer console when debug mode is on
const logMessage = (text: string, extraParameters?: any): void => {
  if (text.indexOf('%c') === -1 && !extraParameters) {
    console.log(text);
  } else {
    const extraParams = extraParameters || '';
    console.log(text, extraParams);
  }
};

const initIfNeeded = (): void => {
  if (!isInitialized()) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    Annyang.init({}, false);
  }
};

const registerCommand = (command: any, cb: any, phrase: string): void => {
  commandsList.push({ callback: cb, originalPhrase: phrase, command });
  if (debugState) {
    logMessage(`Command successfully loaded: ${phrase}`);
  }
};

function parseResults(this: any, results: any[]): void {
  invokeCallbacks(callbacks.result, results);
  let commandText;
  // go over each of the 5 results and alternative results received (we've set maxAlternatives to 5 above)
  for (let i = 0; i < results.length; i += 1) {
    // the text recognized
    commandText = results[i].trim();
    if (debugState) {
      logMessage(`Speech recognized: ${commandText}`);
    }

    // try and match recognized text to one of the commands on the list
    for (let j = 0, l = commandsList.length; j < l; j += 1) {
      const currentCommand = commandsList[j];
      const result = currentCommand.command.exec(commandText);
      if (result) {
        const parameters = result.slice(1);
        if (debugState) {
          logMessage(`command matched: ${currentCommand.originalPhrase}`);
          if (parameters.length) {
            logMessage('with parameters', parameters);
          }
        }
        // execute the matched command
        currentCommand.callback.apply(this, parameters);
        invokeCallbacks(
          callbacks.resultMatch,
          commandText,
          currentCommand.originalPhrase,
          results,
        );
        return;
      }
    }
  }
  invokeCallbacks(callbacks.resultNoMatch, results);
}

class Annyang {
  static init(commands: any, resetCommands: boolean): void {
    let reset: boolean;
    if (resetCommands === undefined) {
      reset = true;
    } else {
      reset = !!resetCommands;
    }

    if (reset) {
      commandsList = [];
    }
    if (commands.length) {
      Annyang.addCommands(commands);
    }
  }

  static debug(newState: any): void {
    if (arguments.length > 0) {
      debugState = !!newState;
    } else {
      debugState = true;
    }
  }

  static addCommands(commands: any): void {
    let cb: any;

    initIfNeeded();

    const phrases = Object.keys(commands);
    for (let i = 0; i < phrases.length; i += 1) {
      const phrase = phrases[i];
      cb = (global as any)[commands[phrase]] || commands[phrase];
      if (typeof cb === 'function') {
        // convert command to regex then register the command
        registerCommand(commandToRegExp(phrase), cb, phrase);
      } else if (typeof cb === 'object' && cb.regexp instanceof RegExp) {
        // register the command
        registerCommand(new RegExp(cb.regexp.source, 'i'), cb.callback, phrase);
      } else if (debugState) {
        logMessage(`Can not register command: ${phrase}`);
      }
    }
  }

  static removeCommands(commandsToRemove: any): boolean | undefined {
    if (commandsToRemove === undefined) {
      commandsList = [];
      return;
    }
    const toRemove = Array.isArray(commandsToRemove)
      ? commandsToRemove
      : [commandsToRemove];
    commandsList = commandsList.filter(command => {
      for (let i = 0; i < toRemove.length; i += 1) {
        if (toRemove[i] === command.originalPhrase) {
          return false;
        }
      }
      return true;
    });
  }

  addCallback(type: string, callback: any, context: any): void {
    if ((callbacks as any)[type] === undefined) {
      return;
    }
    const cb = (global as any)[callback] || callback;
    if (typeof cb !== 'function') {
      return;
    }
    (callbacks as any)[type].push({ callback: cb, context: context || this });
  }

  static removeCallback(type: string, callback: any): void {
    const compareWithCallbackParameter = (cb: any) => {
      return cb.callback !== callback;
    };
    // Go over each callback type in callbacks store object
    const types = Object.keys(callbacks);
    for (let i = 0; i < types.length; i += 1) {
      const callbackType = types[i];
      // eslint-disable-next-line no-prototype-builtins
      if (callbacks.hasOwnProperty(callbackType)) {
        // if this is the type user asked to delete, or he asked to delete all, go ahead.
        if (type === undefined || type === callbackType) {
          // If user asked to delete all callbacks in this type or all types
          if (callback === undefined) {
            (callbacks as any)[callbackType] = [];
          } else {
            // Remove all matching callbacks
            (callbacks as any)[callbackType] = (callbacks as any)[
              callbackType
            ].filter(compareWithCallbackParameter);
          }
        }
      }
    }
  }

  static trigger(sentences: string[]): void {
    let sents = sentences;
    if (!Array.isArray(sentences)) {
      sents = [sentences];
    }

    parseResults(sents);
  }
}

export default Annyang;
