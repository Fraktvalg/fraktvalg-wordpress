=== Fraktvalg ===
Tags: frakt, woocommerce, posten, postnord, helthjem
Contributors: fraktvalg
Requires at least: 5.8
Requires PHP: 7.4
Tested up to: 6.9
Stable tag: 1.3.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Easily provide shipping estimates for your customers based on their postal code.

== Description ==

Fraktvalg is a comprehensive shipping solution designed for WooCommerce, seamlessly integrating major Norwegian carriers Posten, Bring, PostNord, and Helthjem into a single, user-friendly platform. This plugin streamlines your shipping processes, eliminating the need for multiple plugins and ensuring accurate, real-time shipping rates to enhance the customer experience.

**Key Features:**

- Unified Carrier Integration: Consolidate Posten, Bring, PostNord, and Helthjem services within one plugin, simplifying your shipping management.
- Real-Time Shipping Rates: Automatically retrieve up-to-date shipping rates based on product weight, dimensions, and your negotiated agreements, ensuring precise pricing at checkout.
- Customizable Pricing: Set fixed shipping prices, apply surcharges for packaging, or offer discounts to suit your business needs.
- Nearest Pickup Locations: Display the closest pickup points to customers based on their postal codes, enhancing convenience and satisfaction.
- Direct Label Printing: Print shipping labels directly from your WooCommerce dashboard, streamlining order fulfillment and reducing processing time.
- Preferred Carrier Selection: Set and prioritize your preferred shipping providers, ensuring the best options are presented to your customers.

**Requirements:**

To utilize Fraktvalg, you must have active accounts or agreements with the respective shipping providers:

- [PostNord](https://postnord.no): Register as a business customer to access their services.
- [Bring/Posten](https://bring.no): Establish a business agreement to utilize their shipping solutions.
- [Helthjem](https://helthjem.no): Partner with Helthjem to access their delivery network.

Additionally, you need to [sign up for the Fraktvalg API](https://fraktvalg.no/?utm_source=wordpress.org&utm_medium=plugin-details).

**How It Works:**

Fraktvalg operates as a Software-as-a-Service (SaaS) solution, requiring an API key obtainable by signing up at Fraktvalg. Once integrated, the plugin calculates shipping costs in real-time by sending order details—such as item weight, sizes, your shop address, and the customer's delivery address—to the Fraktvalg API. This process ensures accurate communication with each shipping provider, delivering precise rates and options at checkout.

**Privacy information:**

While the plugin does not directly store user data, it transmits necessary order information to the Fraktvalg API to calculate shipping costs accurately. This includes product details and delivery addresses. For comprehensive information on data handling and protection, please review the [Fraktvalg Privacy Policy](https://api.fraktvalg.no/personvern). Additional privacy details are also available in your WordPress admin panel under Tools > Privacy.

**Getting Started:**

Experience the benefits of Fraktvalg with a 14-day free trial, offering unrestricted access to all features. The plugin is designed for quick setup, allowing you to integrate and configure your shipping options in under 5 minutes. With no coding required and free support available, Fraktvalg ensures a smooth and efficient shipping management experience for your WooCommerce store.

By choosing Fraktvalg, you streamline your shipping processes, enhance customer satisfaction with flexible delivery options, and potentially increase your store's conversion rates through optimized shipping solutions.

== Screenshots ==

1. The cart choices showing available shippers, and the cheapest option automatically chosen for the user.
2. The cart choices showing available shipping methods after the customer has chosen a shipping provider, including details like estimated delivery time and pickup location.
3. The Fraktvalg settings page, showing two connected shipping providers, and one not yet configured.
4. The screen presented when clicking through to configure shipping methods for a provider. Giving a site admin the possibility to customize shipping method names, set fixed prices for certain shipping methods, or even give free shipping based on order totals.
5. The preferred shipping provider settings, with a provider chosen, and a discount applied that will undercut the cheapeast competing providers cost by the given amount.
6. The optional settings, where fixed shipping and handling fees can be applied, as well as fallback shipping methods, and the home for settings not tied directly to the shipping providers.

== Frequently Asked Questions ==

= I have a suggestion for enhancements! =

Fantastic! The Fraktvalg plugin is open source, and you can browse the code or give feedback and suggestions via the [GitHub repository](https://github.com/Fraktvalg/fraktvalg-wordpress)

== Changelog ==

= 1.3.2 (2025-09-03) =
* Enhancement: Improve the print experience by adding a local proxy for PDFs to prevent incorrect CORS warnings, and close image label print screens fully when completed.

= 1.3.1 (2025-09-01) =
* Bugfix: Fix an error where the number of shipping methods could not be limited by setting the "max number of shipping methods to show".
* Bugfix: Ensure that default dimensions are passed to the API when products do not have dimensions set.
* Feature: Clear the shipping method caches in more scenarios that could impact shipping alternatives or prices.

= 1.3.0 (2025-08-24) =
* Performance: Reduce shipping method calculation time by up to 60%.
* Features: Introduced individual shipping method overrides. Set fixed prices, free shipping thresholds, or rename individual shipping options to fit your site and needs!
* Features: List orders based on which ones have created shipment consignments, and create consignments when you are ready to send the product.
* Features: Introduce a store phone number setting to the general WooCommerce store settings, which is used for shipping providers who require it to create consignments.
* Translations: Bundle base translations for Norwegian Bokmål.
* Bugfix: Restrict discounts when preferred providers are already the cheaper option.
