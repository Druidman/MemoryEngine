import { Hono } from 'hono'

const app = new Hono()

app.get('/add_memory', (c) => {
  return c.text('Hello Hono!')
})

export default app
