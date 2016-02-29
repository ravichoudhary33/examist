import React, { Component } from "react";
import { Link } from "react-router";
import { connect } from "react-redux";
import { isPending } from "redux-pending";
import * as model from "../../model";
import { Loading, Empty } from "../ui";
import { QuestionList } from "../ui/question";

class Paper extends Component {
    static selector = (state, { params }) => {
        const course = model.resources.Course.selectByCode(params.course)(state);

        return {
            course,
            paper: model.resources.Paper.selectPaperWithQuestions({ 
                period: params.period,
                year: parseInt(params.year),
                course: course.id 
            })(state),
            isLoadingPaper: isPending(model.resources.Paper.getPaper.type)(state)
        };
    };

    static actions = {
        getPaper: model.resources.Paper.getPaper
    };

    componentWillMount() {
        const { paper, params: { course, year, period } } = this.props;

        // When we directly link to the paper
        if(!paper)
            this.props.getPaper(course, year, period);
    }

    componentWillReceiveProps(props) {
        const { isLoadingPaper, params: { course, year, period } } = props;

        // Previous state
        let prevCourse = this.props.params.course;
        let prevYear = this.props.params.year;
        let prevPeriod = this.props.params.period;

        if(!isLoadingPaper && (prevCourse !== course || prevYear !== year || prevPeriod !== period))
            this.props.getPaper(course, year, period);
    }

    render() {
        const { isLoadingPaper, paper } = this.props;

        if(isLoadingPaper) {
            return <Loading />
        }

        if(!paper) {
            return <Empty/>
        }

        let content;
        const questions = paper.questions;
        
        if(questions && questions.length) {
            content = <QuestionList questions={questions} />
        } else {
            content = (
                <p>This paper has no questions yet. Help 
                your course out and <Link to={this.getParserLink()}>pick them from the paper</Link>.</p>
            );
        }

        return (
            <div className="Paper">
                <h3>Questions</h3>
                { content }
            </div>
        );
    }

    getParserLink() {
        const { course, paper } = this.props;
        return `/course/${course.code}/paper/${paper.year_start}/${paper.period}/parse`;
    }
}

export default connect(Paper.selector, Paper.actions)(Paper);