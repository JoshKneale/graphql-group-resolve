import { GraphQLSchema } from 'graphql';

export interface RequestParams {
  schema?: GraphQLSchema;
  queryString: string;
}

export interface QueryArguments {
  name: { value: string };
  value: { value: string | number; kind: string; values: Array<{ kind: string; value: string }> };
}
