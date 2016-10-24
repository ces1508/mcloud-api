'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import config from './config'
import DbStub from './test/stub/db'
import utils from './lib/utils'
// const env = process.env.NODE_ENV || 'test'
const env = 'production'
const hash = httpHash()
let db = new Db(config.db)

if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /create', async function create (req, res, params) {
  let data = await json(req)
  await db.connect()
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let database = await db.find('databases', data.databaseId)
    await utils.checkUser(user, database)
  } catch (e) {
    await db.disconnet()
    return send(res, 401, 'unAuthorized')
  }

  let result = await db.create('contacts', data)
  try {
    await db.updateNumberContacts(data.databaseId)
  } catch  (e) {
    console.log(e.message)
  }
  await db.disconnet()
  send(res, 201, result)
})

hash.set('GET /contacts/:databaseId/page/:skip', async function all (req, res, params) {
  let databaseId = params.databaseId
  let skip	 = params.skip || 0
  skip = parseInt(skip)
  try {
    await db.connect()
    let result = await db.all('contacts', databaseId, 'databaseId', skip, 'firstName')
    let database = await db.find('databases', databaseId)
    result.database = database.name
    send(res, 200, result)

  } catch (e) {
    console.error(e.message)
    return send(res, 500, {error: e.message})
  }
})
hash.set('PATCH /:id', async function update (req, res, params) {
  let user = null
  let id = params.id
  let data = await json(req)
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    let contact = await db.find('contacts', id)
    let database = await db.find('databases', contact.databaseId)
    user = await utils.verifyToken(token, config.secret)
    await utils.checkUser(user, database)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  if (data.firstName) {
    data.firstName = data.firstName.toLowerCase()
  }
   if (data.lastName) {
    data.lastName = data.lastName.toLowerCase()
  }
  let result = await db.update('contacts', id, data)
  await db.disconnet()
  send(res, 200, result)
})
hash.set('GET /:id', async function find (req, res, params) {
  let id = params.id
  let result = null
  await db.connect()
  try {
    let token = await utils.extractToken(req)
    await utils.verifyToken(token, config.secret)
    result = await db.find('contacts', id)
  } catch (e) {
     await db.disconnet()
    return send(res, 401, 'unAuthorized')
  }
  await db.disconnet()
  send(res, 200, result)
})
hash.set('DELETE /:id', async function destroy (req, res, params) {
  let id = params.id
  let database = null
  await db.connect()
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let contact = await db.find('contacts', id)
    database = await db.find('databases', contact.databaseId)
    await utils.checkUser(user, database)
  } catch (e) {
    await db.disconnet()
    if (e.message.match(/not found/)) {
      return send(res, 404, e.message)
    }
    return send(res, 401, 'unAuthorized')
  }
  let result = await db.destroy('contacts', id)
  try {
    await db.updateNumberContacts(database.id)
  } catch (e) {
    console.error(e.message)
  }
  await db.disconnet()
  send(res, 200, result)
})
hash.set('POST /filter/:databaseId/', async function search (req, res, params) {
  let databaseId = params.databaseId
  let data = await json(req)
  await db.connect()
  try {
      let filter = {
      databaseId: databaseId
      }
      let value = data.value.toLowerCase()
      let contacts = await db.customFind('contacts', databaseId,  'databaseId', data.row, value, filter)
      await db.disconnet()
      send(res, 200, contacts)
  } catch (e) {
    return send(res, 404, {error: 'not match'})
  }
})
export default async function main (req, res) {
  let  { method, url } = req
  let match = hash.get(`${method.toUpperCase()} ${url}`)

  if (match.handler) {
    try {
      await match.handler(req, res, match.params)
    } catch (e) {
      send(res, 500, {error: e.message})
    }
  } else {
    send(res, 404, {error: 'route not found'})
  }
}
