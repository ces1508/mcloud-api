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
hash.set('GET /list-images/page/:page', async function allImages (req, res, params) {
  let user = null
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    return send(res, 401, 'unauthorized')
  }
  let images = await db.all('images', user.id, 'userId', 0, 'createdAt')
  send(res, 200, images)
})
hash.set('GET /:id', async function getImage (req, res, params) {
  let id = params.id
  let image = await db.find('images', id)
  send(res, 200, image)
})

hash.set('POST /create', async function createImage (req, res, params) {
  let image = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    image.userId = user.id
    //await utils.checkUser(encoded, image)
  } catch (e) {
    console.error(e.message)
    return send(res, 401, { error: 'unauthorized' })
  }
  let created = await db.create('images', image)
  delete created.userId
  send(res, 201, created)
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
