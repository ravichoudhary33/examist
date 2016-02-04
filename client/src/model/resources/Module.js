import Root from "../Root";
import { omit } from "lodash/object";
import { Resource } from "../../library";
import { collapse, reduce, compose } from "../../library/Selector"
import * as User from "../User";
import * as Paper from "./Paper";

const Module = Root.resources.Module; 

Module.configure({
    key: "id", 
    cleaner: module => omit(module, "papers")
});

/*
 * Get a paper by module, year and period.
 */
export const getModule = Module.createStatefulResourceAction(User.selectAPI, 
    (api, code) => api.getModule(code).then(({ module }) => module));

/**
 * Select a module by code.
 * @param  {String} code Module code.
 * @return {Function}      Selector.
 */
export const selectByCode = (code) => {
    return Module.select(modules => modules.find(module => module.code === code));
};

/**
 * Select a module by ID (or code) and include papers.
 * @param  {Number}   id Module id.
 * @return {Function}    Selector.
 */
export const selectByCodeWithPapers = compose(selectByCode, (module) => {
    return state => module ? ({ 
        ...module, 
        papers: Paper.selectByModule(module.code)(state)
    }) : null;
});

/*
 * Enure modules loaded by user get store in modules resource.
 */
Module.addProducerHandler(User.getModules, ({ modules }) => modules);