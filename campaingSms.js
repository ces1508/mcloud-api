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

hash.set('POST /create', async function createSms (req, res, params) {
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    data.userId = user.id
  } catch (e) {
    return send(res, 401, e.message)
  }
  let result = await db.create('campaingSms', data)
  send(res, 201, result)
})

hash.set('GET /page/:page', async function allSms (req, res, params) {
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
    let result = await db.allCampaing('campaingSms', user.id, skip)
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
    let result = await db.filterCamapings('campaingSms', 'nameCampaing', campaing, {'userId': user.id})
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
    response = await db.customFind('historicSms', id, 'campaingId', data.row, value, {})
    return send(res, 200, response)
  } catch (e) {
    return send(res, 500, {error: e.message})
  }
})
hash.set('PATCH /:id', async function updateSms (req, res, params) {
  let user = null
  let id = params.id
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
    let campaing = db.find('campaingSms', id)
    await utils.checkUser(user, data)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  let campaing = await db.update('campaingSms', id, data)
  send(res, 200, campaing)
})

hash.set('GET /:id/page/:page', async function findSms (req, res, params) {
  let id = params.id
  let campaing = null
  let skip = params.page || 0
  skip = parseInt(skip)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let result = await db.find('campaingSms', id)
    await utils.checkUser(user, result)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  try {
    campaing = await db.all('historicSms', id, 'campaingId', skip, 'Date')
  } catch (e) {
    console.error(e.message)
  }
  send(res, 200, campaing)
})
hash.set('DELETE /:id', async function destroySms (req, res, params) {
  let id = params.id
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = await db.find('campaingSms', id)
    await utils.checkUser(user, campaing)
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  let result = await db.destroy('campaingSms', id)
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
