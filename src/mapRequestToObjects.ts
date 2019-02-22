import util from 'util';
import { QueryArguments } from './interfaces';
import Store from './store';

export default (requestArray: [], store: Store) => {
  /**
   * Creates an object with data about the fields and resolvers required for the query.
   * Data is saved to the store.
   */
  const loopAndLog = (arr: [], resolver: string, parent?: string) => {
    if (!store.requestGroup[resolver]) {
      store.requestGroup[resolver] = {
        parent,
        fields: new Set(),
        arguments: {},
      };
    }

    arr.forEach((selection: { selectionSet: { selections: [] }; name: { value: string }; arguments: [] }) => {
      if (selection.selectionSet) {
        // check if the resolver has arguments supplied
        if (selection.arguments.length) {
          if (!store.requestGroup[selection.name.value]) {
            store.requestGroup[selection.name.value] = {
              parent: resolver,
              fields: new Set(),
              arguments: {},
            };
          }

          selection.arguments.forEach((arg: QueryArguments) => {
            // if there is an array of arguments
            if (arg.value.values) {
              store.requestGroup[selection.name.value].arguments[arg.name.value] = [];
              arg.value.values.forEach(val => {
                store.requestGroup[selection.name.value].arguments[arg.name.value].push(
                  val.kind === 'IntValue' ? Number(val.value) : val.value,
                );
              });
            } else {
              store.requestGroup[selection.name.value].arguments[arg.name.value] =
                arg.value.kind === 'IntValue' ? Number(arg.value.value) : arg.value.value;
            }
            // TODO: account for additional argument types, currently only string as default and Intvalue
          });
        }

        loopAndLog(selection.selectionSet.selections, selection.name.value, resolver);
      } else {
        store.requestGroup[resolver].fields.add(selection.name.value);
      }
    });
  };

  /**
   * Creates a template of the initial request to be used for creating the response
   */
  const createResponseTemplate = (arr: []) => {
    const fields: {
      [key: string]: string;
    } = {};

    arr.forEach((selection: { selectionSet: { selections: [] }; name: { value: string } }) => {
      if (selection.selectionSet) {
        fields[selection.name.value] = 'resolver';
        store.templates[selection.name.value] = createResponseTemplate(selection.selectionSet.selections);
      } else {
        fields[selection.name.value] = 'field';
      }
    });

    return fields;
  };

  // fill up requestGroup object & create response template
  requestArray.forEach((a: any) => {
    loopAndLog(a.selectionSet.selections, a.name.value);

    // check if the top level resolver has arguments supplied
    if (a.arguments.length) {
      a.arguments.forEach((arg: QueryArguments) => {
        // if there is an array of arguments
        if (arg.value.values) {
          store.requestGroup[a.name.value].arguments[arg.name.value] = [];
          arg.value.values.forEach(val => {
            store.requestGroup[a.name.value].arguments[arg.name.value].push(val.kind === 'IntValue' ? Number(val.value) : val.value);
          });
        } else {
          store.requestGroup[a.name.value].arguments[arg.name.value] =
            arg.value.kind === 'IntValue' ? Number(arg.value.value) : arg.value.value;
        }
        // TODO: account for additional argument types, currently only string as default and Intvalue
      });
    }

    // create the response template
    store.templates[a.name.value] = createResponseTemplate(a.selectionSet.selections);
  });

  console.log('requestGroup: ', util.inspect(store.requestGroup, false, null));
};
