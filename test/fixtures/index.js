export default {
  getImage () {
   return {
     id: 'fc52e56b-2a4a-4ed3-b471-d1584714ddc1',
     url: 'http//mepscloud/asdasdiasdas.jpg',
     userId: '98ea81df-764e-4795-9da1-52352b674e3d',
     createdAt: new Date().toString()
   }
 },
 getImages () {
   return [
     this.getImage(),
     this.getImage(),
     this.getImage()
   ]
 },
 getUser () {
   return {
     id: '98ea81df-764e-4795-9da1-52352b674e3d0',
     email: 'ces1508@gmail.com',
     password: 'password',
     company: 'meps.com',
     createdAt: new Date().toString()
   }
 },
 getDatabase () {
   return {
     name: 'first database',
     userId: '98ea81df-764e-4795-9da1-52352b674e3d',
     id: 'fc52e56b-2a4a-4ed3-b471-d1584714ddc1',
     contacts: 2000,
     cretedAt: new Date().toString()
  }
 },
 getDatabases () {
   return [
     this.getDatabase(),
     this.getDatabase(),
     this.getDatabase(),
     this.getDatabase()
   ]
 },
 getTemplate () {
   return {
     name: 'first template',
     template: '<p>hello word </p>',
     userId: '98ea81df-764e-4795-9da1-52352b674e3d',
     createdAt: new Date().toString()
   }
 },
 getTemplates () {
   return [
     this.getTemplate(),
     this.getTemplate(),
     this.getTemplate(),
     this.getTemplate()
   ]
 }
}
