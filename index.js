'use strict';

/*
 * Cached method.
 */

var has = Object.prototype.hasOwnProperty;

/*
 * Hide process use from browserify.
 */

var proc = typeof global !== 'undefined' && global.process;

/*
 * Blacklist of SHAs which are also valid words.
 *
 * GitHub allows abbreviating SHAs up to 7 characters.
 * These are ignored in text because they might just be
 * ment as normal words.  If you’d like these to link to
 * their SHAs, just use more than 7 characters.
 *
 * Generated by:
 *
 *     egrep -i "^[a-f0-9]{7,}$" /usr/share/dict/words
 */

var BLACKLIST = [
    'deedeed',
    'fabaceae'
];

/**
 * Check if a value is a SHA.
 *
 * @param {string} sha
 * @return {boolean}
 */
function isSHA(sha) {
    return BLACKLIST.indexOf(sha.toLowerCase()) === -1;
}

/**
 * Abbreviate a SHA.
 *
 * @param {string} sha
 * @return {string}
 */
function abbr(sha) {
    return sha.slice(0, 7);
}

/*
 * Map of overwrites for at-mentions.
 * GitHub does some fancy stuff with `@mention`, by linking
 * it to their blog-post introducing the feature.
 * To my knowledge, there are no other magical usernames.
 */

var OVERWRITES = {};

OVERWRITES.mentions = OVERWRITES.mention = 'blog/821';

/**
 * Return a URL to GitHub, relative to an optional
 * `repo` object, or `user` and `project`.
 *
 * @param {Object|string?} repo
 * @param {string?} project
 * @return {string}
 */
function gh(repo, project) {
    var base = 'https://github.com/';

    if (project) {
        repo = {
            'user': repo,
            'project': project
        };
    }

    if (repo) {
        base += repo.user + '/' + repo.project + '/';
    }

    return base;
}

/*
 * Username may only contain alphanumeric characters or
 * single hyphens, and cannot begin or end with a hyphen.
 *
 * `PERSON` is either a user or an organization, but also
 * matches a team:
 *
 *   https://github.com/blog/1121-introducing-team-mentions
 */

var NAME = '(?:[a-z0-9]{1,2}|[a-z0-9][a-z0-9-]{1,37}[a-z0-9])';
var USER = '(' + NAME + ')';
var PERSON = '(' + NAME + '(?:\\/' + NAME + ')?)';
var HASH = '([a-f0-9]{7,40})';
var NUMBER = '([0-9]+)';
var PROJECT = '((?:[a-z0-9-]|\\.git[a-z0-9-]|\\.(?!git))+)';
var REPO = USER + '\\/' + PROJECT;

var SHA = new RegExp('^' + HASH + '\\b', 'i');
var USER_SHA = new RegExp('^' + USER + '@' + HASH + '\\b', 'i');
var REPO_SHA = new RegExp('^' + REPO + '@' + HASH + '\\b', 'i');
var ISSUE = new RegExp('^(?:GH-|#)' + NUMBER + '\\b', 'i');
var USER_ISSUE = new RegExp('^' + USER + '#' + NUMBER + '\\b', 'i');
var REPO_ISSUE = new RegExp('^' + REPO + '#' + NUMBER + '\\b', 'i');
var MENTION = new RegExp('^@' + PERSON + '\\b(?!-)', 'i');

/*
 * Match a repo from a git / github URL.
 */

var REPOSITORY = new RegExp(
    '(?:^|/(?:repos/)?)' + REPO + '(?=\\.git|[\\/#@]|$)', 'i'
);

/*
 * Expression that matches characters not used in the above
 * references.
 */

var NON_GITHUB = /^[\s\S]+?(?:[^/.@#_a-zA-Z0-9-](?=[@#_a-zA-Z0-9-])|(?=$))/;

/*
 * Expressions to use.
 */

var expressions = {
    'ghRepoSHA': REPO_SHA,
    'ghUserSHA': USER_SHA,
    'ghSha': SHA,
    'ghRepoIssue': REPO_ISSUE,
    'ghUserIssue': USER_ISSUE,
    'ghIssue': ISSUE,
    'ghMention': MENTION
};

/*
 * Order in which to use expressions.
 */

var order = [
    'ghRepoSHA',
    'ghUserSHA',
    'ghSha',
    'ghRepoIssue',
    'ghUserIssue',
    'ghIssue',
    'ghMention'
];

/**
 * Render a SHA relative to a repo.
 *
 * @property {boolean} notInLink
 * @this {Parser}
 * @param {Function} eat
 * @param {string} $0 - Whole content.
 * @param {Object} $1 - Username.
 * @param {Object} $2 - Project.
 * @param {Object} $3 - SHA.
 * @return {Node?}
 */
function ghRepoSHA(eat, $0, $1, $2, $3) {
    var now = eat.now();
    var href;
    var value;

    if (isSHA($3)) {
        href = gh($1, $2) + 'commit/' + $3;
        value = $1 + '/' + $2 + '@' + abbr($3);

        return eat($0)(this.renderLink(true, href, value, null, now, eat));
    }
}

ghRepoSHA.notInLink = true;

/**
 * Render a SHA relative to a user.
 *
 * @property {boolean} notInLink
 * @this {Parser}
 * @param {Function} eat
 * @param {string} $0 - Whole content.
 * @param {Object} $1 - Username.
 * @param {Object} $2 - SHA.
 * @return {Node?}
 */
function ghUserSHA(eat, $0, $1, $2) {
    var now = eat.now();
    var href;
    var value;

    if (isSHA($2)) {
        href = gh($1, this.github.project) + 'commit/' + $2;
        value = $1 + '@' + abbr($2);

        return eat($0)(this.renderLink(true, href, value, null, now, eat));
    }
}

ghUserSHA.notInLink = true;

/**
 * Render a SHA.
 *
 * @property {boolean} notInLink
 * @this {Parser}
 * @param {Function} eat
 * @param {string} $0 - Whole content.
 * @param {Object} $1 - SHA.
 * @return {Node?}
 */
function ghSha(eat, $0, $1) {
    var now = eat.now();
    var href;

    if (isSHA($1)) {
        href = gh(this.github) + 'commit/' + $1;

        return eat($0)(this.renderLink(true, href, abbr($0), null, now, eat));
    }
}

ghSha.notInLink = true;

/**
 * Render an issue relative to a repo.
 *
 * @property {boolean} notInLink
 * @this {Parser}
 * @param {Function} eat
 * @param {string} $0 - Whole content.
 * @param {Object} $1 - Username.
 * @param {Object} $2 - Project.
 * @param {Object} $3 - Issue number.
 * @return {Node}
 */
function ghRepoIssue(eat, $0, $1, $2, $3) {
    var now = eat.now();
    var href = gh($1, $2) + 'issues/' + $3;

    return eat($0)(this.renderLink(true, href, $0, null, now, eat));
}

ghRepoIssue.notInLink = true;

/**
 * Render an issue relative to a user.
 *
 * @property {boolean} notInLink
 * @this {Parser}
 * @param {Function} eat
 * @param {string} $0 - Whole content.
 * @param {Object} $1 - Username.
 * @param {Object} $2 - Issue number.
 * @return {Node}
 */
function ghUserIssue(eat, $0, $1, $2) {
    var now = eat.now();
    var href = gh($1, this.github.project) + 'issues/' + $2;

    return eat($0)(this.renderLink(true, href, $0, null, now, eat));
}

ghUserIssue.notInLink = true;

/**
 * Render an issue.
 *
 * @property {boolean} notInLink
 * @this {Parser}
 * @param {Function} eat
 * @param {string} $0 - Whole content.
 * @param {Object} $1 - Issue number.
 * @return {Node}
 */
function ghIssue(eat, $0, $1) {
    var now = eat.now();
    var href = gh(this.github) + 'issues/' + $1;

    return eat($0)(this.renderLink(true, href, $0, null, now, eat));
}

ghIssue.notInLink = true;

/**
 * Render a mention.
 *
 * @param {Function} eat
 * @param {string} $0 - Whole content.
 * @param {Object} $1 - Username.
 * @return {Node}
 */
function ghMention(eat, $0, $1) {
    var now = eat.now();
    var href = gh() + (has.call(OVERWRITES, $1) ? OVERWRITES[$1] : $1);

    return eat($0)(this.renderLink(true, href, $0, null, now, eat));
}

ghMention.notInLink = true;

/**
 * Factory to parse plain-text, and look for github
 * entities.
 *
 * @param {Object} repo - User/project object.
 * @return {Function} - Tokenizer.
 */
function inlineTextFactory(repo) {
    /**
     * Factory to parse plain-text, and look for github
     * entities.
     *
     * @param {Function} eat
     * @param {string} $0 - Content.
     * @return {Array.<Node>}
     */
    function inlineText(eat, $0) {
        var self = this;
        var now = eat.now();

        self.github = repo;

        return eat($0)(self.augmentGitHub($0, now));
    }

    return inlineText;
}

/**
 * Attacher.
 *
 * @param {MDAST} mdast
 * @param {Object?} [options]
 */
function attacher(mdast, options) {
    var repo = (options || {}).repository;
    var proto = mdast.Parser.prototype;
    var scope = proto.inlineTokenizers;
    var current = scope.inlineText;
    var pack;

    /*
     * Get the repo from `package.json`.
     */

    if (!repo) {
        try {
            pack = require(require('path').resolve(
                proc.cwd(), 'package.json'
            ));
        } catch (exception) {
            pack = {};
        }

        repo = pack.repository ? pack.repository.url || pack.repository : '';
    }

    /*
     * Parse the URL.
     * See the tests for all possible URL kinds.
     */

    repo = REPOSITORY.exec(repo);

    REPOSITORY.lastIndex = 0;

    if (!repo) {
        throw new Error('Missing `repository` field in `options`');
    }

    repo = {
        'user': repo[1],
        'project': repo[2]
    };

    /*
     * Add a tokenizer to the `Parser`.
     */

    proto.augmentGitHub = proto.tokenizeFactory('gh');

    /*
     * Copy tokenizers, expressions, and methods.
     */

    proto.ghMethods = order.concat();

    proto.ghTokenizers = {
        'ghSha': ghSha,
        'ghUserSHA': ghUserSHA,
        'ghRepoSHA': ghRepoSHA,
        'ghRepoIssue': ghRepoIssue,
        'ghUserIssue': ghUserIssue,
        'ghIssue': ghIssue,
        'ghMention': ghMention
    };

    proto.expressions.gfm.ghSha = expressions.ghSha;
    proto.expressions.gfm.ghUserSHA = expressions.ghUserSHA;
    proto.expressions.gfm.ghRepoSHA = expressions.ghRepoSHA;
    proto.expressions.gfm.ghIssue = expressions.ghIssue;
    proto.expressions.gfm.ghUserIssue = expressions.ghUserIssue;
    proto.expressions.gfm.ghRepoIssue = expressions.ghRepoIssue;
    proto.expressions.gfm.ghMention = expressions.ghMention;

    /*
     * Overwrite `inlineText`.
     */

    proto.ghMethods.push('ghText');
    proto.ghTokenizers.ghText = current;
    proto.expressions.gfm.ghText = NON_GITHUB;
    scope.inlineText = inlineTextFactory(repo);
}

/*
 * Expose.
 */

module.exports = attacher;
