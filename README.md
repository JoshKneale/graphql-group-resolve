# GraphQL group resolve

A graphQL resolver behaviour replacement.

## Installation

```bash
npm install graphql-group-resolve
```

## Description

This module was designed to increase the performance of complex graphQL queries. It does this by grouping up calls to resolvers where possible, replacing the default functionality of resolving fields one by one.

For more detail on the "why" this project was started, see here: (I haven't written it yet ok, I'll do it soon!)

### Important notes about the functionality (READ THESE)

1. graphql-group-resolve will only run when a query has sub-resolvers\*, if it’s a single level query it will default to the graphQL flow.
2. When delegating to a sub-resolver the parent will pass in the a single version of the parents name + “Ids” e.g. when user is getting wallets, “userIds” will be passed as the argument name. The presence of this argument on the target resolver is checked before the module is run, if this argument is not found, the request will be defaulted to using graphQL functionality.
3. In order to get the single version of a resolvers name, [Pluralize](https://github.com/blakeembrey/pluralize) is used to convert the strings. With the english language being what it is, if you have oddly named resolvers, you may run into issues.
4. graphql-group-resolve currently requires your graphQL server to be using [Apollo Server](https://github.com/apollographql/apollo-server) in order to function properly.

\* sub-resolvers refer to any nested resolver, for example in the following query "comments" would be a sub-resolver

```
{
  users {
    id
    firstName
    lastName
    comments { #sub-resolver
      id
      userId
      content
    }
  }
}
```

## Usage

```javascript
import groupResolve from 'graphql-group-resolve';

// list of graphQL endpoints
const endpoints: Service[] = [
  { uri: 'http://localhost:4001/graphql' },
  { uri: 'http://localhost:4002/graphql' },
  { uri: 'http://localhost:4003/graphql' },
];

// initiate group-resolve
groupResolve(true, endpoints);
```

## Authors and acknowledgment

Props to the team at [Apollo](https://www.apollographql.com/). The additional features you bring to the graphQL tool set are invaluable, keep up the good work!

Shout out to the authors of the [Pluralize](https://github.com/blakeembrey/pluralize) module. You saved me many hours of having to deal with the pitfalls of the english language.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
