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

hash.set('POST /create', async function createCampaingSms (req, res, params) {
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    data.userId = user.id
  } catch (e) {
    console.error(e.message)
    return send(res, 401, e.message)
  }
  if(!data.templateId) {
    return send(res, 400, 'debes enviar el templateId')
  }
  if(!data.databaseId) {
    return send(res, 400, 'debes enviar el databaseId')
  }
  let result = await db.create('campaingEmails', data)
  send(res, 201, result)
})

hash.set('GET /page/:page', async function allCampaingEmails (req, res, params) {
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
    let result = await db.allCampaing('campaingEmails', user.id, skip)
    send(res, 200, result)
  } catch (e) {
    return send(res,500, e)
  }
})
hash.set('POST /filter', async function filterCampaings (req, res, params) {
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = data.campaing
    console.log(user.id)
    let result = await db.filterCamapings('campaingEmails', 'nameCampaing', campaing, {'userId': user.id})
    console.log(result)
    send(res, 200, result)
  } catch (e) {
    return send(res, 500, {error: e.message})
  }
})
hash.set('POST /filter-data/:id', async function filterDataCampaings (req, res, params) {
  let data = await json(req)
  let response = null
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    console.error(e.message)
    return send(res, 401, 'unAuthorized')
  }
  try {
    let id = params.id
      let value = data.value.toLowerCase()
      response = await db.customFind('historicEmail', id, 'campaingId', data.row, value, {})
    return send(res, 200, response)
  } catch (e) {
    return send(res, 500, {error: e.message})
  }
})
hash.set('PATCH /:id', async function updateCampaingEmail(req, res, params) {
  let user = null
  let id = params.id
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
    let campaing = db.find('campaingEmails', id)
    await utils.checkUser(user, data)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  let campaing = await db.update('campaingEmails', id, data)
  send(res, 200, campaing)
})

hash.set('GET /:id/page/:page', async function findEmails (req, res, params) {
  let id = params.id
  let campaing = null
  let skip = params.page || 0
  skip = parseInt(skip)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let result = await db.find('campaingEmails', id)
    await utils.checkUser(user, result)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  try {
    campaing = await db.all('historicEmail', id, 'campaingId', skip, 'date')

  } catch (e) {
    console.error(e.message)
  }
  send(res, 200, campaing)
})
hash.set('DELETE /:id', async function destroyEmail (req, res, params) {
  let id = params.id
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = await db.find('campaingEmails', id)
    await utils.checkUser(user, campaing)
  } catch (e) {
    console.log(e.message)
    return send(res, 401, 'unAuthorized')
  }
  let result = await db.destroy('campaingEmails', id)
  await db.disconnet()
  send(res, 200, result)
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
