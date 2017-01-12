'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import config from './config'
import DbStub from './test/stub/db'
import utils from './lib/utils'
import request from 'request-promise'
import uuid from 'uuid-base62'
import sleep from 'then-sleep'
// const env = process.env.NODE_ENV || 'test'
const env = 'production'
const hash = httpHash()
let db = new Db(config.db)

hash.set('POST /create', async function create (req, res, params) {
  let data = await json(req)
  try {
    await sleep(10)
    await db.connect()
    let promises = []
    for (let i = 0; i < data.length; i++) {
      if (data[i].campaingId) {
        let newData = {
          campaingId: data[i].campaingId,
          event: data[i].event,
          email: data[i].email,
          date: data[i].timestamp,
          userId: data[i].userId
        }
        promises.push(db.createHook(newData))
      }
    }
    await Promise.all(promises)
  } catch (e) {
    console.error(e.message)
    return send(res, 500, {error: e.message})
  }
})
//test optimzate hook

hash.set('GET /', async function get (req, res, params) {
  try {
    send(res, 200, {algo: 'asdasdasda'})
  } catch (e) {
    console.error(e.message)
  }
})
hash.set('POST /', async function testPost (req, res, params) {
 let options = {
  method: 'POST',
  uri: 'https://gateway.plusmms.net/rest/message',
  headers: {
    'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA=ad'
  },
    resolveWithFullResponse: true,
    json: true,
    body: {
      to: ['573203230522'],
      text: 'asdasdasdasd adsads',
      tresc: 'true',
      from: '3203230522'
    }
  }
 // try {
  let history = []
  for (let i = 0; i <= 1; i++) {
    try {
      await request(options)
      history.push({
        number: options.body.to[0],
        text: options.body.text,
        status: 'send'
      })
    } catch (e) {
      history.push({
        number: options.body.to[0],
        text: options.body.text,
        status: 'failed'
      })
    }
  }
   return send(res, 201,history)
 // } catch (e) {
   // console.log(e.message)
   // return send(res, 200, `error: ${e.message}`)
 // }
})
// hash.set('GET /loaderio-aea8ef80676eb14bca4c66b0f8397353', async function loaderio (req, res, params) {
//   send(res, 200, 'loaderio-aea8ef80676eb14bca4c66b0f8397353')
// })
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
