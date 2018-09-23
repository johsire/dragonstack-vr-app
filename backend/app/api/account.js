
const { Router } = require('express');
const Session = require('../account/session');
const AccountTable = require('../account/table');
const { hash } = require('../account/helper');
const { setSession } = require('./helper')

const router = new Router();

router.post('/signup', (req, res, next) => {
 const { username, password } = req.body;
 const usernameHash = hash(username);
 const passwordHash = hash(password);

 AccountTable.getAccount({ usernameHash })
  .then(({ account }) => {
    if (!account) {
      return AccountTable.storeAccount({ usernameHash, passwordHash })
    } else {
      const error = new Error('This username has already been taken!');

      error.statusCode = 409;

        throw error;
      }
    })
    .then(() => {
      return setSession({ username, res})
    })
    .then(({ message }) => res.json({ message }))
    .catch(error => next(error));
});


router.post('/login', (req, res, next) => {
  const { username, password } = req.body;

  AccountTable.getAccount({ usernameHash: hash(username) })
    .then(({ account }) => {
      if (account && account.passwordHash === hash(password)) {
        const { sessionId } = account;

        return setSession({ username, res, sessionId })
      } else {
        const error = new Error ('Invalid username/password');

        error.statusCode = 409;

        throw error;
      }
    })
    .then(({ message }) => res.json({ message }))
    .catch(error => next(error));
});

router.get('/authenticated', (req, res, next) => {
  const { sessionString } = req.cookies;

  if (!sessionString || !Session.verify(sessionString)) {
    const error = new Error('Invalid Session');

    error.statusCode = 400;

    return next(error);
  } else {
    const { username, id } = Session.parse(sessionString);
    console.log(hash(username), 'username hash IN ELSE STATEMENT');

  AccountTable.getAccount({ usernameHash: hash(username) })
    .then(({ account }) => {
      const authenticated = account.sessionId === id;
      res.json({ authenticated });
    })
    .catch(error => next (error));
  }
});

router.get('/logout', (req, res, next) => {
  // We call the parse function on Session; its a static fn that splits
  // up a session string n returns an object with the relevant parts;
  const { username } = Session.parse(req.cookies.sessionString);

  AccountTable.updateSessionId({
    sessionId: null,
    usernameHash: hash(username)
  }).then(() => {
    res.clearCookie('sesssionString');

    res.json({ message: 'Successful Logout!' })
  }).catch(error => next(error));
});

module.exports = router;
