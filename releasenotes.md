### [v1.2.18](https://github.com/adrai/sessionstore/compare/v1.2.16...v1.2.18)
- fix for new mongodb driver

### [v1.2.16](https://github.com/adrai/sessionstore/compare/v1.2.15...v1.2.16)
- recover elasticsearch connection after temp ping error [#39](https://github.com/adrai/sessionstore/issues/39) [#40](https://github.com/adrai/sessionstore/pull/40) thanks to [ewjmulder](https://github.com/ewjmulder)

### [v1.2.15](https://github.com/adrai/sessionstore/compare/v1.2.14...v1.2.15)
- redis, mongodb: call disconnect on ping error

### [v1.2.14](https://github.com/adrai/sessionstore/compare/v1.2.13...v1.2.14)
- Support mongo connection string

### [v1.2.13](https://github.com/adrai/sessionstore/compare/v1.2.12...v1.2.13)
- redis, mongodb: call disconnect on ping error

### [v1.2.12](https://github.com/adrai/sessionstore/compare/v1.2.11...v1.2.12)
- redis: added optional heartbeat

### [v1.2.11](https://github.com/adrai/sessionstore/compare/v1.2.9...v1.2.11)
- some updates

### [v1.2.9](https://github.com/adrai/sessionstore/compare/v1.2.8...v1.2.9)
- redis: fix for new redis lib

### [v1.2.8](https://github.com/adrai/sessionstore/compare/v1.2.7...v1.2.8)
- mongodb: added optional heartbeat

### [v1.2.7](https://github.com/adrai/sessionstore/compare/v1.2.6...v1.2.7)
- couchdb: fixed undefined is not function issue for expires [#28](https://github.com/adrai/sessionstore/issues/28) thanks to [priyanknarvekar](https://github.com/priyanknarvekar)

### [v1.2.6](https://github.com/adrai/sessionstore/compare/v1.2.5...v1.2.6)
- mongodb: give possibility to use authSource

### [v1.2.5](https://github.com/adrai/sessionstore/compare/v1.2.4...v1.2.5)
- redis: implemented touch

### [v1.2.4](https://github.com/adrai/sessionstore/compare/v1.2.3...v1.2.4)
- optimization for `npm link`'ed development

### [v1.2.3](https://github.com/adrai/sessionstore/compare/v1.1.0...v1.2.3)
- added elasticsearch support

### [v1.1.0](https://github.com/adrai/sessionstore/compare/v1.0.6...v1.1.0)
- session expiration comes from cookie now

### v1.0.6
- added mongodb driver 2.x support

### v1.0.5
- replace json-serialize with jsondate

### v1.0.4
- fix memcached implementation

### v1.0.3
- parse json with json-serialize
