process.env.TESTENV = true

let Item = require('../app/models/item.js')
let User = require('../app/models/user')

const crypto = require('crypto')

let chai = require('chai')
let chaiHttp = require('chai-http')
let server = require('../server')
chai.should()

chai.use(chaiHttp)

const token = crypto.randomBytes(16).toString('hex')
let userId
let itemId

describe('Items', () => {
  const itemParams = {
    name: '13 JavaScript tricks WDI instructors don\'t want you to know',
    description: 'You won\'believe number 8!',
    status: false,
    priority: 5
  }

  before(done => {
    Item.remove({})
      .then(() => User.create({
        email: 'caleb@cc',
        hashedPassword: '12345',
        token
      }))
      .then(user => {
        userId = user._id
        return user
      })
      .then(() => Item.create(Object.assign(itemParams, {owner: userId})))
      .then(record => {
        itemId = record._id
        done()
      })
      .catch(console.error)
  })

  describe('GET /items', () => {
    it('should get all the items', done => {
      chai.request(server)
        .get('/items')
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.items.should.be.a('array')
          res.body.items.length.should.be.eql(1)
          done()
        })
    })
  })

  describe('GET /items/:id', () => {
    it('should get one item', done => {
      chai.request(server)
        .get('/items/' + itemId)
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.items.should.be.a('object')
          res.body.items.name.should.eql(itemParams.name)
          done()
        })
    })
  })

  describe('DELETE /items/:id', () => {
    let itemId

    before(done => {
      Item.create(Object.assign(itemParams, { owner: userId }))
        .then(record => {
          itemId = record._id
          done()
        })
        .catch(console.error)
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .delete('/items/' + itemId)
        .set('Authorization', `Bearer notarealtoken`)
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should be succesful if you own the resource', done => {
      chai.request(server)
        .delete('/items/' + itemId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })
  })

  describe('POST /items', () => {
    it('should not POST an item without a name', done => {
      let noTitle = {
        description: 'Unnamed',
        owner: 'fakedID'
      }
      chai.request(server)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: noTitle })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not POST an item without description', done => {
      let noText = {
        name: 'Not a very good item, is it?',
        owner: 'fakeID'
      }
      chai.request(server)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: noText })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not allow a POST from an unauthenticated user', done => {
      chai.request(server)
        .post('/items')
        .send({ items: itemParams })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should POST an item with the correct params', done => {
      let validItem = {
        name: 'I ran a shell command. You won\'t believe what happened next!',
        description: 'it was rm -rf / --no-preserve-root',
        status: true,
        priority: 4
      }
      chai.request(server)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: validItem })
        .end((e, res) => {
          res.should.have.status(201)
          res.body.should.be.a('object')
          res.body.should.have.property('items')
          res.body.items.should.have.property('name')
          res.body.items.should.have.property('status')
          res.body.items.should.have.property('priority')
          res.body.items.name.should.eql(validItem.name)
          done()
        })
    })
  })

  describe('PATCH /items/:id', () => {
    let itemId

    const fields = {
      name: 'Find out which HTTP status code is your spirit animal',
      description: 'Take this 4 question quiz to find out!',
      status: false,
      priority: 8
    }

    before(async function () {
      const record = await Item.create(Object.assign(itemParams, { owner: userId }))
      itemId = record._id
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .patch('/items/' + itemId)
        .set('Authorization', `Bearer notarealtoken`)
        .send({ items: fields })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should update fields when PATCHed', done => {
      chai.request(server)
        .patch(`/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ items: fields })
        .end((e, res) => {
          res.should.have.status(202)
          done()
        })
    })

    it('shows the updated resource when fetched with GET', done => {
      chai.request(server)
        .get(`/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.items.name.should.eql(fields.name)
          res.body.items.description.should.eql(fields.description)
          done()
        })
    })
  })
})
