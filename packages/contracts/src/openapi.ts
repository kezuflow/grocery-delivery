export type OpenApiDocument = Readonly<Record<string, unknown>>;

const jsonResponse = (description = "Validated JSON response") => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } },
});

const protectedOperation = (summary: string, method = "get", successStatus = "200") => ({
  [method]: {
    summary,
    security: [{ sessionCookie: [] }],
    responses: {
      [successStatus]: jsonResponse(),
      "401": jsonResponse("Authentication is required"),
      "403": jsonResponse("The active session lacks permission"),
      "429": jsonResponse("The request rate limit was exceeded"),
    },
  },
});

export const openApiDocument: OpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Carbon Food Delivery API",
    version: "0.0.0",
    description: "Server-owned contracts for the Carbon Food Delivery API.",
  },
  servers: [{ url: "/", description: "Current API origin" }],
  tags: [
    { name: "system" },
    { name: "catalog" },
    { name: "customer" },
    { name: "operations" },
    { name: "delivery" },
    { name: "payments" },
  ],
  paths: {
    "/health": {
      get: { tags: ["system"], summary: "Health check", responses: { "200": jsonResponse() } },
    },
    "/api/v1/health": {
      get: {
        tags: ["system"],
        summary: "Versioned health check",
        responses: { "200": jsonResponse() },
      },
    },
    "/api/v1/plans": {
      get: {
        tags: ["customer"],
        summary: "List public plans",
        responses: { "200": jsonResponse() },
      },
    },
    "/api/v1/catalog": {
      get: {
        tags: ["catalog"],
        summary: "Search and list active catalog items",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100 },
          },
          { name: "cursor", in: "query", required: false, schema: { type: "string" } },
          { name: "search", in: "query", required: false, schema: { type: "string" } },
          { name: "category", in: "query", required: false, schema: { type: "string" } },
          {
            name: "sort",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["popular", "name", "price-low", "price-high"] },
          },
          {
            name: "minPriceCentavos",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
          },
          {
            name: "maxPriceCentavos",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
          },
        ],
        responses: { "200": jsonResponse(), "400": jsonResponse("Invalid query or pagination") },
      },
    },
    "/api/v1/catalog/{slug}": {
      get: {
        tags: ["catalog"],
        summary: "Read one active catalog item",
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonResponse(), "404": jsonResponse("Catalog item not found") },
      },
    },
    "/api/v1/promotions/banners": {
      get: {
        tags: ["customer"],
        summary: "Read active promotional banners",
        responses: { "200": jsonResponse(), "400": jsonResponse("Invalid placement") },
      },
    },
    "/api/v1/promotions/banners/analytics": {
      post: {
        tags: ["customer"],
        summary: "Record a bounded promotion banner event",
        responses: { "202": jsonResponse(), "400": jsonResponse("Invalid analytics event") },
      },
    },
    "/api/v1/me": protectedOperation("Read the current session", "get"),
    "/api/v1/account/export": protectedOperation("Export the current account", "get"),
    "/api/v1/account/profile": protectedOperation("Correct the account profile", "put"),
    "/api/v1/account/consents": protectedOperation("Record an account consent", "post"),
    "/api/v1/account/sessions/revoke": protectedOperation("Revoke one account session", "post"),
    "/api/v1/account/sessions/revoke-all": protectedOperation(
      "Revoke every account session",
      "post",
    ),
    "/api/v1/account/deletion-eligibility": protectedOperation("Read deletion eligibility", "get"),
    "/api/v1/account/deletion-request": protectedOperation("Request account deletion", "post"),
    "/api/v1/subscription": {
      ...protectedOperation("Read the current subscription", "get"),
      ...protectedOperation("Create a subscription from an active plan", "post", "201"),
    },
    "/api/v1/subscription/actions": protectedOperation("Apply a subscription action", "post"),
    "/api/v1/cart": {
      ...protectedOperation("Read the saved cart", "get"),
      ...protectedOperation("Replace the saved cart", "put"),
    },
    "/api/v1/delivery-address": {
      ...protectedOperation("Read the delivery address", "get"),
      ...protectedOperation("Save the delivery address", "put"),
    },
    "/api/v1/delivery-addresses": {
      ...protectedOperation("List saved delivery addresses", "get"),
      ...protectedOperation("Add a saved delivery address", "post", "201"),
    },
    "/api/v1/delivery-addresses/{id}/select": protectedOperation(
      "Select the checkout delivery address",
      "put",
    ),
    "/api/v1/delivery-windows": {
      ...protectedOperation("Read delivery windows", "get"),
      ...protectedOperation("Select a delivery window", "put"),
    },
    "/api/v1/orders": { ...protectedOperation("Lock an order from the saved cart", "post") },
    "/api/v1/orders/{id}/tracking": protectedOperation("Read order tracking", "get"),
    "/api/v1/orders/{id}/media": protectedOperation("Read proof-of-delivery media", "get"),
    "/api/v1/order-requests": {
      ...protectedOperation("List cancellation and refund requests", "get"),
      ...protectedOperation("Create a cancellation or refund request", "post", "201"),
    },
    "/api/v1/order-substitutions": protectedOperation(
      "List customer substitution proposals",
      "get",
    ),
    "/api/v1/order-substitutions/{id}/decision": protectedOperation(
      "Accept or reject a substitution proposal",
      "post",
    ),
    "/api/v1/deliveryman/assignments": protectedOperation("Read deliveryman assignments", "get"),
    "/api/v1/deliveryman/events": protectedOperation("Record a delivery event", "post"),
    "/api/v1/deliveryman/media": protectedOperation("Request a proof-of-delivery upload", "post"),
    "/api/v1/payments/methods": {
      ...protectedOperation("List payment methods", "get"),
      ...protectedOperation("Add a payment method", "post"),
    },
    "/api/v1/payments/methods/{id}": protectedOperation("Revoke a payment method", "delete"),
    "/api/v1/payments/charge": protectedOperation("Charge an order", "post"),
    "/api/v1/payments/webhooks/{provider}": {
      post: {
        tags: ["payments"],
        summary: "Apply a provider webhook",
        responses: { "200": jsonResponse(), "400": jsonResponse("Invalid webhook") },
      },
    },
    "/api/v1/admin/plans/{id}": protectedOperation("Propose a plan change", "put"),
    "/api/v1/admin/catalog": protectedOperation("List editable catalog details", "get"),
    "/api/v1/admin/catalog/categories": protectedOperation(
      "Create an idempotent catalog category",
      "post",
      "201",
    ),
    "/api/v1/admin/catalog/categories/{id}": protectedOperation(
      "Update an idempotent catalog category",
      "put",
    ),
    "/api/v1/admin/catalog/items": protectedOperation(
      "Create an idempotent catalog product",
      "post",
      "201",
    ),
    "/api/v1/admin/catalog/items/{id}": protectedOperation(
      "Update an idempotent catalog product",
      "put",
    ),
    "/api/v1/admin/catalog/images/uploads": protectedOperation(
      "Request an idempotent catalog image upload",
      "post",
      "201",
    ),
    "/api/v1/admin/catalog/images/{id}/complete": protectedOperation(
      "Complete a catalog image upload",
      "post",
    ),
    "/api/v1/catalog/images/{id}": {
      get: {
        tags: ["catalog"],
        summary: "Read a published catalog image",
        responses: {
          "200": { description: "Catalog image bytes" },
          "404": jsonResponse("Not found"),
        },
      },
    },
    "/api/v1/admin/catalog/{id}/status": protectedOperation(
      "Update catalog product lifecycle status",
      "patch",
    ),
    "/api/v1/admin/launch-configuration": protectedOperation(
      "Apply an idempotent launch catalog and delivery-window configuration",
      "put",
    ),
    "/api/v1/admin/identity/roles": protectedOperation("Assign a server-owned role", "post"),
    "/api/v1/admin/plan-change-requests/{id}/decision": protectedOperation(
      "Approve or reject a plan change",
      "post",
    ),
    "/api/v1/admin/procurement": protectedOperation("Read procurement demand", "get"),
    "/api/v1/admin/procurement/purchases": protectedOperation(
      "Record procurement purchases",
      "put",
    ),
    "/api/v1/admin/procurement/shortages": protectedOperation("Record a shortage", "post"),
    "/api/v1/admin/procurement/substitutions": protectedOperation("Record a substitution", "post"),
    "/api/v1/admin/packing/manifests": protectedOperation("Update a packing manifest", "post"),
    "/api/v1/admin/dispatch": {
      ...protectedOperation("Read dispatch assignments", "get"),
      ...protectedOperation("Assign an order", "post"),
    },
    "/api/v1/admin/operations/projection": protectedOperation(
      "Read operational projections",
      "get",
    ),
    "/api/v1/admin/audit": protectedOperation("Read audit history", "get"),
    "/api/v1/support/cases": {
      ...protectedOperation("List customer support cases", "get"),
      ...protectedOperation("Create a customer support case", "post", "201"),
    },
    "/api/v1/notification-preferences": {
      ...protectedOperation("Read notification preferences", "get"),
      ...protectedOperation("Update notification preferences", "put"),
    },
    "/api/v1/saved-items": protectedOperation("List saved grocery items", "get"),
    "/api/v1/saved-items/{skuId}": {
      ...protectedOperation("Save a grocery item", "put"),
      ...protectedOperation("Remove a saved grocery item", "delete"),
    },
    "/api/v1/admin/support/cases": protectedOperation("List support cases", "get"),
    "/api/v1/admin/support/cases/{id}/status": protectedOperation(
      "Update support case status",
      "patch",
    ),
    "/api/v1/admin/payments/refunds": protectedOperation("Refund a payment", "post"),
    "/api/v1/admin/order-requests": protectedOperation(
      "List pending cancellation and refund requests",
      "get",
    ),
    "/api/v1/admin/order-requests/{id}/decision": protectedOperation(
      "Approve and execute or reject an order request",
      "post",
    ),
    "/api/v1/admin/promotion-banners": {
      ...protectedOperation("List promotion banners", "get"),
      ...protectedOperation("Create a promotion banner", "post", "201"),
    },
    "/api/v1/admin/promotion-banners/{id}/status": protectedOperation(
      "Update promotion banner status",
      "patch",
    ),
    "/api/v1/admin/promotion-media/uploads": protectedOperation(
      "Request a promotion media upload",
      "post",
      "201",
    ),
    "/api/auth/{path}": {
      post: {
        tags: ["system"],
        summary: "Better Auth endpoint",
        responses: { "200": jsonResponse(), "401": jsonResponse() },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: { type: "apiKey", in: "cookie", name: "better-auth.session_token" },
    },
    schemas: {
      ApiResponse: {
        oneOf: [
          {
            type: "object",
            required: ["data", "meta"],
            properties: { data: {}, meta: { $ref: "#/components/schemas/ResponseMeta" } },
          },
          { $ref: "#/components/schemas/ApiErrorResponse" },
        ],
      },
      ResponseMeta: {
        type: "object",
        required: ["correlationId"],
        properties: { correlationId: { type: "string", minLength: 1, maxLength: 128 } },
      },
      ApiErrorResponse: {
        type: "object",
        required: ["error", "meta"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: { code: { type: "string" }, message: { type: "string" } },
          },
          meta: { $ref: "#/components/schemas/ResponseMeta" },
        },
      },
    },
  },
};
