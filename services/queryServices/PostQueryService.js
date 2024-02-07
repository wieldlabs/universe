const PostService = require("../PostService")["Service"];

class PostQueryService extends PostService {
  async richContent(e, r, t) {
    return await this.canRead(e, r, t) ? e?.richContent : null;
  }
}

module.exports = {
  Service: PostQueryService
};