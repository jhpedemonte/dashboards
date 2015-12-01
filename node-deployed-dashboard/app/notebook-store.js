var store = {};

function add(nbpath, notebook) {
    store[nbpath] = notebook;
}

function get(nbpath) {
    return store[nbpath];
}

function remove(nbpath) {
    delete store[nbpath];
}

module.exports = {
    add: add,
    get: get,
    remove: remove
};
