'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import config from './config'
import DbStub from './test/stub/db'
import utils from './lib/utils'
// const env = process.env.NODE_ENV || 'test'
const env = 'proudction'
const hash = httpHash()
let db = new Db(config.db)

if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /create', async function create (req, res, params) {
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    data.userId = user.id
  } catch (e) {
    return send(res, 401, e.message)
  }
  try {
    let result = await db.create('databases', data)
    send(res, 201, result)
  } catch (e) {
    return send(res, 500, {error: 'lo sentimos ha ocurrido un error, por favor intentar mas tarde'})
  }
})

hash.set('GET /page/:page', async function all (req, res, params) {
  let user = null
  let skip = params.page || 0
  skip = parseInt(skip)
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  try {
    let result = await db.all('databases', user.id, 'userId', skip, 'createdAt')
    send(res, 200, result)
  } catch (e) {
     return send(res, 500, {error: 'lo sentimos ha ocurrido un error, por favor intentar mas tarde'})
  }

})
hash.set('POST /filter', async function filterDatabases (req, res, params) {
  let user = null
  let data = await json(req)
  if (!data.name){
    return send(res, 400, {error: 'debes enviar el parametro name para poder raealizar la busquedad'})
  }
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    return send (res,401, 'unAuthorized')
  }
  try {
    let value = data.name.toLowerCase()
    let response = await db.customFind('databases', user.id, 'userId', 'name', value, {})
    send (res, 200, response)
  } catch (e) {
    return send(res, 500, {error : 'lo sentimos ha ocurrido un error, por favor intentar mas tarde'})
  }
})
hash.set('PATCH /:id', async function update (req, res, params) {
  let user = null
  let id = params.id
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
    let database = await db.find('databases', id)
    await utils.checkUser(user, database)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }

  try {
    let result = await db.update('databases', id, data)
    send(res, 200, result)
  } catch (e) {
    return send(res, 500, {error: 'lo sentimos ha ocurrido un error, por favor intentar mas tarde'})
  }

})
hash.set('GET /:id', async function find (req, res, params) {
  let id = params.id
  let result = null

  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    await utils.checkUser(user, result)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  result = await db.find('databases', id)
  send(res, 200, result)
})
hash.set('DELETE /:id', async function destroy (req, res, params) {
  let id = params.id
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let database = await db.find('databases', id)
    await utils.checkUser(user, database)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  let result = await db.destroyDatabase(id)
  send(res, 200, result)
})

export default async function main (req, res) {
  let  { method, url } = req
  let match = hash.get(`${method.toUpperCase()} ${url}`)

  if (match.handler) {
    try {
      await match.handler(req, res, match.params)
    } catch (e) {
      console.error(`error ${new Date()} : ${e.message}`)
      send(res, 500, {error: 'lo sentimos ha ocurrido un error, por favor intentar mas tarde'})
    }
  } else {
    send(res, 404, {error: 'route not found'})
  }
}
