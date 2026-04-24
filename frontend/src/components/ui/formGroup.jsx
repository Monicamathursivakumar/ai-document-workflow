// src/components/ui/FormGroup.jsx
import React from "react";
import { Link } from "react-router-dom";

const FormGroup = ({
    label,
    htmlFor,
    children,
    rightLabel,
    rightLabelLink,
    className = "",
}) => {
    return (
        <div className={`w-full ${className}`}>
            {/* Top row: Label + Right Label (Forgot Password) */}
            <div className="flex justify-between items-center mb-2">
                {label && (
                    <label
                        htmlFor={htmlFor}
                        className="text-sm font-medium text-gray-700"
                    >
                        {label}
                    </label>
                )}

                {rightLabel && rightLabelLink && (
                    <Link
                        to={rightLabelLink}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                        {rightLabel}
                    </Link>
                )}
            </div>

            {/* Input or child component */}
            {children}
        </div>
    );
};

export default FormGroup;
