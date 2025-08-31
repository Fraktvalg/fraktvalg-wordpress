import React from "react";
import { createRoot } from 'react-dom/client';
import Shipping from './Shipping/index.jsx';
import './Shipping/shipping.pcss';

const domNode = document.getElementById('fraktvalg-label-meta-box');

// Check that the DOM node exists before rendering
if (domNode) {
	const root = createRoot(domNode);
	root.render( <Shipping /> );
}
