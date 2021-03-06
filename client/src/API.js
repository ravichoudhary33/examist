import Debug from "debug";
import fetch from "isomorphic-fetch";
import { API_BASE_URL, DEBUG } from "./Config";

const debug = Debug("examist:api");

export default class API {
    constructor(key) {
        this.key = key;
    }

    /**
     * Perform a request and return the raw Response object.
     * Make a request to the path supplied on API_BASE_URL.
     * @param  {String} method  GET|PUT|POST|DELETE|OPTIONS|HEAD
     * @param  {String} path    The pathname of the URL e.g. /login
     * @param  {Object} data    The data to supply in the request body (JSON encoded).
     * @param  {Object} headers The headers to send with the request.
     * @return {Promise} -> {Response} Resolves to response object.
     */
    static rawRequest(method, path, data = {}, headers = {}) {
        method = method.toUpperCase(); // Normalize the method

        debug(`>> %c${method} ${API_BASE_URL}${path}${headers["Auth-Key"] ? " (authorized)" : ""}`, "color: purple", data);

        return fetch(API_BASE_URL + path, {
            method, 
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: method !== "GET" ? JSON.stringify(data) : undefined
        });
    }

    /**
     * Make a request to the path supplied on API_BASE_URL.
     * @param  {String} method  GET|PUT|POST|DELETE|OPTIONS|HEAD
     * @param  {String} path    The pathname of the URL e.g. /login
     * @param  {Object} data    The data to supply in the request body (JSON encoded).
     * @param  {Object} headers The headers to send with the request.
     * @return {Promise} -> {Object} Resolves to response data object (JSON).
     */
    static request(method, path, data = {}, headers = {}) {
        return API.rawRequest(method, path, data, headers).then(response => {
            // Parse the JSON
            return Promise.all([response.json(), response]);
        }).catch(error => {
            // Match invalid JSON response
            if(error instanceof SyntaxError && error.message.match(/Unexpected end of input/))
                throw new InvalidResponse("Invalid JSON response.");

            if(DEBUG) console.error("Network Error: ", error.stack);
        }).then(data => {
            let [body, response] = data;

            debug("<< %s", response.status, body)

            // Throw any HTTP errors
            if(response.status >= 400) 
                throw new HTTPError(response.status, body.message, body);

            return body;
        });
    }

    /**
     * Make an authorized request to the API.
     * @param  {String} method See API.request.
     * @param  {String} path   See API.request.
     * @param  {Object} data   See API.request.
     * @return {Promise}       See API.request.
     */
    request(method, path, data) {
        return API.request(method, path, data, { "Auth-Key": this.key });
    }

    /**
     * Log the user into the API.
     * @param  {Object} details { username, password }
     * @return {Promise} -> {Object}
     */
    static login({ email, password }) {
        return API.request("POST", "/login", { email, password });
    }

    /**
     * Create a new user.
     * @param  {String} options.name     User's name.
     * @param  {String} options.email    User's email.
     * @param  {String} options.password User's password.
     * @return {Promise} -> {Response}
     */
    static createUser({ name, email, password }) {
        return API.request("POST", "/user", { name, email, password });
    }

    /**
     * Get university by their domain name. e.g. nuigalway.ie. Used when
     * finding the university on the signup page.
     * @param  {String} domain The university domain.
     * @return {Promise} -> {Insititution}
     */
    static getInstitutionByDomain(domain) {
        return API.request("GET", `/institution/search?domain=${domain}`);
    }

    /**
     * Get the current logged in user's own courses.
     * @return {Promise} -> {Object{courses: Array}}
     */
    getCourses() {
        return this.request("GET", "/profile/courses");
    }

    /**
     * Get a course by code.
     * @param  {String} code Code e.g. CT470
     * @return {Promise} -> {Object}
     */
    getCourse(code) {
        return this.request("GET", `/course/${code}`);
    }

    /**
     * Get a course and popular questions.
     * @param  {String} code Code e.g. CT470
     * @return {Promise} -> {Object}
     */
    getPopular(code) {
        return this.request("GET", `/course/${code}/popular`);
    }

    /**
     * Search for courses.
     * @param  {String} query The query.
     * @return {Promise} -> {Object{courses: Array}}
     */
    searchCourses(query) {
        return this.request("GET", `/course/search?q=${query}`);
    }

    /**
     * Add a course to a users profile.
     * @param   {Number}  id Course id.
     * @returns {Promise} -> {Response}
     */
    addCourse(id) {
        return this.request("PATCH", "/profile/courses", { course: id });
    }

    /**
     * Remove a course from the user's courses.
     * @param  {Number} id Course id.
     * @return {Promise} -> {Response}
     */
    removeCourse(id) {
        return this.request("DELETE", "/profile/courses", { course: id });
    }

    /**
     * Get a paper course, year, period.
     * @param  {String} course Code e.g. CT470
     * @param  {Number} year   The year e.g. 2007
     * @param  {String} period One of ["summer", "winter", "autumn", "spring"]
     * @return {Promise} -> {Object}
     */
    getPaper(course, year, period) {
        return this.request("GET", `/course/${course}/paper/${year}/${period}`);
    }

    /**
     * Get the contents of a paper.
     *
     * WARNING: This method is not like the rest. The API will return HTML so instead
     * of trying to parse JSON, we return the raw request object. Another gotcha of
     * this method is that the API will return 202 and an empty body if the paper is
     * downloading but not yet ready to be served, so repeat requests are required to
     * check if the paper is ready yet. A 200 will signify the contents are returned.
     * 
     * @param  {String} course Code e.g. CT470
     * @param  {Number} year   The year e.g. 2007
     * @param  {String} period One of ["summer", "winter", "autumn", "spring"]
     * @return {Promise} -> {Request}
     */
    getPaperContents(course, year, period) {
        return this.rawRequest("GET", `/course/${course}/paper/${year}/${period}.html`);
    }

    /**
     * Get a question by path.
     * 
     * @param  {String} course   Course code.
     * @param  {Number} year     The paper year.
     * @param  {String} period   The paper's period.
     * @param  {String} path     The question's path.
     * @return {Promise} -> {Response}
     */
    getQuestion(course, year, period, path) {
        return this.request("GET", `/course/${course}/paper/${year}/${period}/q/${path}`);
    }

    /**
     * Get similar questions.
     * 
     * @param  {String} course   Course code.
     * @param  {Number} year     The paper year.
     * @param  {String} period   The paper's period.
     * @param  {String} path     The question's path.
     * @return {Promise} -> {Response}
     */
    getSimilarQuestions(course, year, period, path) {
        return this.request("GET", `/course/${course}/paper/${year}/${period}/q/${path}/similar`);
    }

    /**
     * Create a new question for a paper.
     * 
     * @param  {String} course   Course code.
     * @param  {Number} year     The paper year.
     * @param  {String} period   The paper's period.
     * @param  {Object} question The question data.
     * @param  {Object} parent   The parent question data.
     * @return {Promise} -> {Response}
     */
    createQuestion(course, year, period, question, parent) {
        let url = `/course/${course}/paper/${year}/${period}/q/`;

        if(parent)
            url += parent.path.join(".")

        return this.request("POST", url, question);
    }

    /**
     * Update a question on a paper.
     * 
     * @param  {String} course   Course code.
     * @param  {Number} year     The paper year.
     * @param  {String} period   The paper's period.
     * @param  {Object} question The question data.
     * @return {Promise} -> {Response}
     */
    updateQuestion(course, year, period, question) {
        return this.request("PUT", `/course/${course}/paper/${year}/${period}/q/${question.path.join(".")}`, question);
    }

    /**
     * Remove a question from a paper.
     * 
     * @param  {String} course   Course code.
     * @param  {Number} year     The paper year.
     * @param  {String} period   The paper's period.
     * @param  {Object} question The question data.
     * @return {Promise} -> {Response}
     */
    removeQuestion(course, year, period, question) {
        return this.request("DELETE", `/course/${course}/paper/${year}/${period}/q/` + question.path.join("."));
    }

    /**
     * Get comments for an entity.
     * @param  {Number} entity The entity id.
     * @return {Promise} -> {Response}
     */
    getComments(entity) {
        return this.request("GET", `/comments/${entity}`);
    }

    /**
     * Create a new comment.
     * @param  {Number} entity  The entity id.
     * @param  {String} content The comment content.
     * @param  {Number} parent  The parent comment id.
     * @return {Promise} -> {Response}
     */
    createComment(entity, content, parent) {
        return this.request("POST", `/comment/${entity}`, { content, parent });
    }


    /**
     * Update a comment.
     * @param  {Number} entity  The entity id.
     * @param  {Number} comment The comment id.
     * @param  {String} content The comment content.
     * @return {Promise} -> {Response}
     */
    updateComment(entity, comment, content) {
        return this.request("PUT", `/comment/${entity}/${comment}`, { content });
    }


    /**
     * Delete a comment.
     * @param  {Number} entity  The entity id.
     * @param  {Number} comment  The comment id.
     * @return {Promise} -> {Response}
     */
    deleteComment(entity, comment) {
        return this.request("DELETE", `/comment/${entity}/${comment}`);
    }

    /**
     * Create a new note link.
     * @param  {String} course              Course code.
     * @param  {Number} year                Paper year.
     * @param  {String} period              Paper period.
     * @param  {String} question            Question path.
     * @param  {String} options.description Link description.
     * @param  {String} options.link        Link URL.
     * @return {Promise} -> {Response}
     */
    createNoteLink(course, year, period, question, { description, link }) {
        return this.request("POST", `/course/${course}/paper/${year}/${period}/q/${question}/note`, { description, link });
    }

    /**
     * Get notes for a question.
     * @param  {String} course              Course code.
     * @param  {Number} year                Paper year.
     * @param  {String} period              Paper period.
     * @param  {String} question            Question path.
     * @return {Promise} -> {Response}
     */
    getNotes(course, year, period, question) {
        return this.request("GET", `/course/${course}/paper/${year}/${period}/q/${question}/notes`);
    }

    /**
     * Test if the auth key is valid.
     * @return {Promise} -> {Response}
     */
    checkAuth() {
        return this.request("GET", "/auth");
    }

    /**
     * Create a new API from an Auth key. 
     * @param  {String} key The Auth key.
     * @return {Promise} -> {Response} Verify the auth key.
     */
    static fromAuthKey(key) {
        return (new API(key)).checkAuth();
    }
}

export class HTTPError extends Error {
    constructor(status, message, body) {
        super(`${status}: ${message}`);
        this.status = status;
        this.message = message;
        this.body = body;
    }
}

export class InvalidResponse extends Error {}
export class InvalidAuthKey extends Error {}