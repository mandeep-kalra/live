'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var beliefSchema = new Schema({
    sID: {                           //tell you the parent section of a statement
        type: String,
        default: "P__N__"
    },
    statement: String,
    linked_ln: { type: Array, default: [] }
});

module.exports = mongoose.model('beliefSchema', beliefSchema);