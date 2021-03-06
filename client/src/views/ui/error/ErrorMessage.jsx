import "../../../../style/Error.scss";
import React, { PropTypes } from "react";
import { Flex } from "../layout";

export default function ErrorMessage(props) {
    let message;

    if(props.error) message = <p>{ props.error.message }</p>;
    else if(props.message) message = props.message;
    else message = props.children;

    return (
        <Flex className="ErrorMessage">
            { message }
        </Flex>
    );
}

Error.propTypes = {
    error: PropTypes.instanceOf(Error),
    message: PropTypes.string.isRequired
};