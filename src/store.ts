/**
 * A new instance of this class is instantiated on request. It is used to store temporary data needed for mapping results correctly.
 */
export default class Store {
  /**
   * Store for primary keys
   *
   * Used for sub-resolvers that rely on arguments to be passed
   */
  public keys: {
    [key: string]: number[];
  } = {};

  /**
   * An array of strings containing a list of resolvers
   *
   * Resolvers are removed from this array as they are completed
   */
  public resolversToSendRequestsTo: string[] = [];

  // TODO: add desc
  public resolversToBuild: string[] = [];

  // TODO: add desc
  public templates: {
    [key: string]: {
      [key: string]: string;
    };
  } = {};

  /**
   * Store for resolvers, their fields, any arguments and if they are a sub-resolver or not (have a parent resolver)
   */
  public requestGroup: {
    [key: string]: {
      fields: Set<string>;
      parent: string | undefined;
      arguments: {
        [key: string]: any;
      };
      children: string[];
    };
  } = {};

  /**
   * Store for resolvers results - to be mapped to the return object
   */
  public results: {
    [key: string]: {
      result?: any;
      mappedResults?: {
        [key: string]: object[];
      };
    };
  } = {};
}
