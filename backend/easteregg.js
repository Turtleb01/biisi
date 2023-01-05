module.exports = (id, res) => {
  switch(id) {
    case "4Li2WHPkuyCdtmokzW2007":
    case "1auxYwYrFRqZP7t3s7w4um":
      res.redirect("https://www.youtube.com/watch?v=YeO23a4kdFQ");
      return true;
      break;
    case "4cOdK2wGLETKBW3PvgPWqT":
    case "6VPOVkex1tTqsMlMyH8Ebf":
      res.redirect("https://www.youtube.com/watch?v=lXMskKTw3Bc");
      return true;
      break;
    default:
      return false;
  }
}
