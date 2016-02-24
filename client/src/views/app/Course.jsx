import React, { Component } from "react";
import { Link } from "react-router";
import { connect } from "react-redux";
import { isPending } from "redux-pending";
import Model, * as model from "../../model";
import { PaperGrid } from "../ui/paper";
import { Loading } from "../ui/";
import { Box, Flex } from "../ui/layout";

class Course extends Component {
    static selector = (state, { params }) => ({
        course: model.resources.Course.selectByCodeWithPapers(params.course)(state),
        paper: params.course && params.year && params.period ? 
            model.resources.Paper.selectPaper(params.course, params.year, params.period)(state) : null,
        isLoadingCourse: isPending(model.resources.Course.getCourse.type)(state)
    });

    static actions = {
        getCourse: model.resources.Course.getCourse
    };

    componentWillMount() {
        console.log(Model.getState());
        if(!this.props.course)
            this.props.getCourse(this.props.params.course)
    }

    render() {
        let course = this.props.course;

        if(this.props.isLoadingCourse) {
            return <Loading />
        } else if(course) {
            return (
                <Flex className="Course">
                    <Box>
                        <Flex><h1><Link to={`/course/${course.code}`}>{ course.code.toString().toUpperCase() }</Link></h1></Flex>
                        <Flex><h3>{ course.name }</h3></Flex>
                    </Box>
                    
                    <PaperGrid papers={course.papers} course={course.code} currentPaper={this.props.paper}/>

                    { this.props.children }
                </Flex>
            );
        } else return (<div>Course not found.</div>);
    }
}

export default connect(Course.selector, Course.actions)(Course);