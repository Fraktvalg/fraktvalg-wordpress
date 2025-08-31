import React from "react";
import { createRoot } from 'react-dom/client';
import Onboarding from "./Onboarding/index.jsx";

const domNode = document.getElementById('fraktvalg-onboarding');

// Check that the DOM node exists before rendering
if (domNode) {
	const root = createRoot(domNode);
	root.render( <Onboarding /> );
}
