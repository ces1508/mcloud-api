export default {
  db: {
    // host: '104.131.43.30',
    host: 'localhost',
    port: 28015,
    db: 'mepscloud'
  },
  secret: process.env.MEPSCLOUD_SECRET || '8938105e-d60f-40d1-b449-ee0b5140e9e5'
}
