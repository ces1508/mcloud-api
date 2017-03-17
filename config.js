export default {
  db: {
    // host: '104.131.43.30',
    host: 'localhost',
    port: 28015,
    user: 'm3pscl0ud',
    db: 'mepscloud',
    password: process.env.MEPSCLOUD_SECRET_DATABASE || 'M3psCl0ud...$2017.'
  },
  secret: process.env.MEPSCLOUD_SECRET || 'test'
}
