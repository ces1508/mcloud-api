'use strict'

import fixtures from '../fixtures/'

export default class Db {
  connect () {
    return Promise.resolve(true)
  }
  disconnet () {
    return Promise.resolve(true)
  }

  find (table, id) {
    if (table === 'databases') return Promise.resolve(fixtures.getDatabase())
    if (table === 'templateEmails') return Promise.resolve(fixtures.getTemplate())
    return Promise.resolve(fixtures.getImage())
  }
  create (table) {
    if (table === 'users') return Promise.resolve(fixtures.getUser())
    if (table === 'databases') return Promise.resolve(fixtures.getDatabase())
    if (table === 'templateEmails') return Promise.resolve(fixtures.getTemplate())
    return Promise.resolve(fixtures.getImage())
  }
  update (table) {
    if (table === 'databases') return Promise.resolve(fixtures.getDatabase())
    if (table === 'templateEmails') return Promise.resolve(fixtures.getTemplate())
  }
  all (table) {
    if (table === 'databases') return Promise.resolve(fixtures.getDatabases())
    if (table === 'templateEmails') return Promise.resolve(fixtures.getTemplates())
    return Promise.resolve(fixtures.getImages())
  }
  destroy (table, id) {
    let databases = fixtures.getDatabases()
    databases = databases.length
     if (table === 'databases') return Promise.resolve(fixtures.getDatabases())
     if (table === 'templateEmails') return Promise.resolve({deleted: 1})
  }

  authenticate (username, password) {
    return Promise.resolve(true)
  }
}
