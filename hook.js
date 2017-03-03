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
const r = require('rethinkdbdash')({host: '104.131.43.30',port: 28015})
// const env = process.env.NODE_ENV || 'test'
const env = 'production'
const hash = httpHash()
// let db = new Db(config.db)
const events = ['', 'click', 'open', 'bounce', 'dropped', 'spamreport']
const ramdom = function () {
  Math.floor((Math.random() * 5) + 1)
  return events[Math.floor((Math.random() * 5) + 1)]
}
hash.set('POST /create', async function create (req, res, params) {
  let data = await json(req)
  try {
    for (let i = 0; i < data.length; i++) {
      if (data[i].campaingId) {
        let newData = {
          campaingId: data[i].campaingId,
          event: data[i].event,
          email: data[i].email,
          date: data[i].timestamp,
        }
        let campaign = await r.db('mepscloud').table('campaingEmails').get(newData.campaingId)
        if (campaign) {
          newData.userId = campaign.userId
          let old_data = await r.db('mepscloud').table('historicEmail').getAll(data[i].email, {index: 'email'})
          .filter({campaingId: data[i].campaingId})
          if (old_data.event === 'click') {
            await r.db('mepscloud').table('historicEmail').getAll(data[i].email, {index: 'email'})
            .filter({campaingId: newData.campaingId}).update({date: newData.date})
          } else {
             await r.db('mepscloud').table('historicEmail').getAll(data[i].email, {index: 'email'})
            .filter({campaingId: newData.campaingId}).update({event: newData.event, date: newData.date})
          }
        }
      }
    }
    return send(res, 201, {data: 'created'})
  } catch (e) {
    console.error(e.message)
    return send(res, 500, {error: e.message})
  }
})

hash.set('GET /', async function get (req, res, params) {
  try {
    send(res, 200, {algo: 'asdasdasda'})
  } catch (e) {
    console.error(e.message)
  }
})
//  hash.set('GET /loaderio-aea8ef80676eb14bca4c66b0f8397353', async function loaderio (req, res, params) {
//    send(res, 200, 'loaderio-aea8ef80676eb14bca4c66b0f8397353')

//  })
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
