<p align="center"><img width="40%" src="https://raw.githubusercontent.com/enteam/enfunc/master/icons/cloud-computing.png"/>
</p>

# Enfunc

[![Build Status](https://travis-ci.com/enteam/enfunc.svg?branch=master)](https://travis-ci.com/enteam/enfunc)
[![Build Status](https://travis-ci.com/enteam/enfunc.svg?branch=master)](https://travis-ci.com/enteam/enfunc)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fenteam%2Fenfunc.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fenteam%2Fenfunc?ref=badge_shield)
[![](https://img.shields.io/docker/pulls/enteam/enfunc.svg)](https://hub.docker.com/r/enteam/enfunc/)
[![](https://img.shields.io/docker/stars/enteam/enfunc.svg)](https://hub.docker.com/r/enteam/enfunc/)
[![](https://img.shields.io/github/license/enteam/enfunc.svg)](https://github.com/enteam/enfunc)
[![](https://img.shields.io/github/issues/enteam/enfunc.svg)](https://github.com/enteam/enfunc)

Open-source self-hosted serverless experience with high-availability power-up's

## :rocket: Quick start
```
# install in on the cluster
wget https://raw.githubusercontent.com/enteam/enfunc/readme/docker-compose.yml
docker-compose up -d
```
*Deploy the your first serverless app in seconds*
```
# install the enfunc-cli
yarn global add enfunc-cli
```
Create new app
```
# create new npm project
```
Then, you can write some cloud functions code!
```javascript
// src/index.js
const runtime = require('./runtime.js');
module.exports.helloWorld = runtime.functions.onRequest(async (req, res) => {
  res.json({
    message: 'Hello World!'
  })
});
```
The `runtime.js` file you can grab from https://raw.githubusercontent.com/enteam/enfunc/master/runtime.js
```
# Deploy your app
export ENFUNC_HOST=http://<yourEnfuncNodeAddress>:<yourEnfuncNodePort> # without a trailing slash
enfunc deploy --app my-first-app
```
And... Yup! Your first serverless enfunc app is accessible from 
`http://<yourEnfuncNodeAddress>:<yourEnfuncNodePort>/functions/invoke/my-first-app/helloWorld`


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fenteam%2Fenfunc.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fenteam%2Fenfunc?ref=badge_large)