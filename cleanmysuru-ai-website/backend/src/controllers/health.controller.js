/**
 * Health check controller
 */
function getHealth(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'CleanMysuru AI Backend',
  });
}

module.exports = {
  getHealth,
};
