import axios from 'axios';
import introspectionQuery from './introspection-query';
import { resolverMap } from './resolverDeets';
import pluralize from 'pluralize';

export interface Service {
  uri: string;
}

/**
 * Introspects the services and gets the data required for the modules functionality to run.
 */
export const populateResolverDetails = async (services: Service[]): Promise<void> => {
  await Promise.all(
    services.map(async (service: Service) => {
      // introspect service
      const res = await axios({
        url: service.uri,
        method: 'post',
        data: {
          query: introspectionQuery,
        },
      });

      // map data to resolverMap
      res.data.data.__schema.types[0].fields.forEach((field: any) => {
        resolverMap[field.name] = {
          serviceUrl: service.uri,
          returnType: field.type.kind === 'LIST' ? 'array' : 'object',
          nameAsSingular: pluralize(field.name, 1),
          groupArgs: field.args.map((arg: { name: string, type: { kind: string, ofType: { name: string } } }) => {
            if (arg.type.kind === 'LIST' && arg.type.ofType.name === 'Int') {
              return arg.name
            }
            return;
          }).filter((e: string | undefined) => !!e)
        };
      });
    }),
  );

  console.log('resolverMap after populating: ', resolverMap);
};