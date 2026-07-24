/**
 * Standard API response envelope (see AGENTS.md).
 */
function success(res, data = null, message = "OK", status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
    errors: [],
  });
}

function fail(res, message = "Request failed", status = 400, errors = []) {
  return res.status(status).json({
    success: false,
    message,
    data: null,
    errors,
  });
}

module.exports = { success, fail };
