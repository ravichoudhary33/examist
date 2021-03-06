import { Resource } from "../../library";
import { updateResources } from "../../library/Resource"; 
import { compose } from "../../library/Selector"
import * as User from "../User";

const Course = new Resource("courses", "id");

/*
 * Get a paper by course, year and period.
 */
export const getCourse = Course.createStatefulAction("GET_COURSE", User.selectAPI, 
    (api, code) => api.getCourse(code));

/*
 * Get a paper by course, year and period.
 */
export const getPopular = Course.createStatefulAction("GET_POPULAR", User.selectAPI, 
    (api, code) => api.getPopular(code));

/*
 * Search for courses.
 */
export const search = Course.createStatefulAction("COURSE_SEARCH", User.selectAPI, 
    (api, query) => api.searchCourses(query));

/**
 * Select a course by code.
 * @param  {String}   code Course code.
 * @return {Function}      Selector.
 */
export const selectByCode = (code) => {
    return Course.select(courses => courses.find(course => course.code === code.toUpperCase()));
};

/**
 * Select a course by id.
 * @param  {String}   id   Course id.
 * @return {Function}      Selector.
 */
export const selectById = (id) => {
    return Course.select(courses => courses.find(course => course.id === id));
};

/**
 * Select papers for a course.
 * @param  {String}   id The course id.
 * @return {Function}    Selector.
 */
export const selectPapers = id => state => {
    return state.resources.papers.filter(paper => paper.course === id);
};

/**
 * Select a course by ID (or code) and include papers.
 * @param  {Number}   id Course id.
 * @return {Function}    Selector.
 */
export const selectByCodeWithPapers = compose(selectByCode, course => state => ({ 
    ...course, 
    papers: selectPapers(course.id)(state)
}));

/*
 * Ensure courses loaded by user get store in courses resource.
 */
Course.addProducer(getCourse, ({ course }) => course);

Course.handleAction(getPopular, updateResources((c, { course }) => {
    return c.id === course.id
}, (course, { popular_questions }) => ({
    ...course,
    popular_questions: popular_questions.map(q => q.id)
})));

Course.handleAction("GET_PAPER", (courses, { course }) => {
    const existingCourse = courses.find(c => c.id === course.id);

    if(existingCourse && existingCourse.popular_questions) {
        return courses.map(ec => {
            if(ec.id === existingCourse.id) {
                course.popular_questions = [...existingCourse.popular_questions]
                return course;
            } else return ec;
        });
    } else return [...courses, course];
});

Course.addProducer(User.getCourses, ({ courses }) => courses);
Course.addProducer(search, ({ courses }) => courses);

export default Course;