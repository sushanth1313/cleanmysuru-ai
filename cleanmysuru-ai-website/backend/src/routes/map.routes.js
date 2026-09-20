const { Router } = require('express');
const mapController = require('../controllers/map.controller');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = Router();

router.get('/complaints', optionalAuth, (req, res, next) =>
  mapController.getMapComplaints(req, res, next)
);

router.get('/markers', optionalAuth, (req, res, next) =>
  mapController.getMapComplaints(req, res, next)
);

router.get('/incidents', optionalAuth, (req, res, next) =>
  mapController.getMapComplaints(req, res, next)
);

router.get('/search', (req, res, next) =>
  mapController.searchLocations(req, res, next)
);

router.get('/reverse', (req, res, next) =>
  mapController.reverseGeocode(req, res, next)
);

module.exports = router;
