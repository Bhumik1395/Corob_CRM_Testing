import test from "node:test";
import assert from "node:assert/strict";

// 1. Test Login Redirection Logic
function getLoginRedirect(roles, authenticated) {
    if (!authenticated) return null;
    if (roles.includes("admin") || roles.includes("corob_employee")) {
        return "/dashboard/focus";
    }
    if (roles.includes("customer")) {
        return "/customer/pm";
    }
    return "/unauthorized";
}

test("Login redirection: admin redirects to /dashboard/focus", () => {
    assert.equal(getLoginRedirect(["admin"], true), "/dashboard/focus");
});

test("Login redirection: corob_employee redirects to /dashboard/focus", () => {
    assert.equal(getLoginRedirect(["corob_employee"], true), "/dashboard/focus");
});

test("Login redirection: customer redirects to /customer/pm", () => {
    assert.equal(getLoginRedirect(["customer"], true), "/customer/pm");
});

test("Login redirection: unassigned role redirects to /unauthorized", () => {
    assert.equal(getLoginRedirect(["guest"], true), "/unauthorized");
    assert.equal(getLoginRedirect([], true), "/unauthorized");
});

// 2. Test ProtectedRoute Access Guard
function checkRouteAccess(allowedRoles, userRoles) {
    return allowedRoles.some((r) => userRoles.includes(r));
}

test("ProtectedRoute: /dashboard (allowedRoles: ['corob_employee', 'admin'])", () => {
    const allowed = ["corob_employee", "admin"];
    assert.equal(checkRouteAccess(allowed, ["admin"]), true, "Admin must have access to dashboard");
    assert.equal(checkRouteAccess(allowed, ["corob_employee"]), true, "Employee must have access to dashboard");
    assert.equal(checkRouteAccess(allowed, ["customer"]), false, "Customer must NOT have access to dashboard");
    assert.equal(checkRouteAccess(allowed, ["unknown"]), false, "Unknown role must NOT have access");
});

test("ProtectedRoute: /dashboard/upload (allowedRoles: ['admin'])", () => {
    const allowed = ["admin"];
    assert.equal(checkRouteAccess(allowed, ["admin"]), true, "Admin must have access to upload");
    assert.equal(checkRouteAccess(allowed, ["corob_employee"]), false, "Employee must NOT have access to upload");
    assert.equal(checkRouteAccess(allowed, ["customer"]), false, "Customer must NOT have access to upload");
});

test("ProtectedRoute: /customer (allowedRoles: ['customer'])", () => {
    const allowed = ["customer"];
    assert.equal(checkRouteAccess(allowed, ["customer"]), true, "Customer must have access to customer dashboard");
    assert.equal(checkRouteAccess(allowed, ["admin"]), false, "Admin must NOT use customer dashboard route directly");
    assert.equal(checkRouteAccess(allowed, ["corob_employee"]), false, "Employee must NOT use customer dashboard route directly");
});

// 3. Test Dashboard Navigation Items
const employeeNavItems = [
    { to: "/dashboard/focus", label: "Service Calls" },
    { to: "/dashboard/pm", label: "Preventive Measure" },
    { to: "/dashboard/installation", label: "Installation" },
    { to: "/dashboard/utilization", label: "Engineer Utilization" },
    { to: "/dashboard/pm/print", label: "Print Docs" },
];

const adminNavItems = [
    ...employeeNavItems,
    { to: "/dashboard/upload", label: "Upload Data" },
];

function getNavForUser(roles) {
    const isAdmin = roles.includes("admin");
    const roleLabel = isAdmin ? "Admin" : roles.includes("corob_employee") ? "Corob Employee" : "";
    const navItems = isAdmin ? adminNavItems : employeeNavItems;
    return { roleLabel, navItems };
}

test("DashboardShell nav: admin gets Upload Data and Admin label", () => {
    const { roleLabel, navItems } = getNavForUser(["admin"]);
    assert.equal(roleLabel, "Admin");
    const paths = navItems.map((n) => n.to);
    assert.ok(paths.includes("/dashboard/upload"), "Admin nav must include upload");
    assert.ok(paths.includes("/dashboard/focus"), "Admin nav must include focus");
    assert.ok(paths.includes("/dashboard/pm"), "Admin nav must include pm");
    assert.ok(paths.includes("/dashboard/installation"), "Admin nav must include installation");
    assert.ok(paths.includes("/dashboard/utilization"), "Admin nav must include utilization");
    assert.ok(paths.includes("/dashboard/pm/print"), "Admin nav must include print");
    assert.equal(paths.length, 6);
});

test("DashboardShell nav: employee does NOT get Upload Data", () => {
    const { roleLabel, navItems } = getNavForUser(["corob_employee"]);
    assert.equal(roleLabel, "Corob Employee");
    const paths = navItems.map((n) => n.to);
    assert.equal(paths.includes("/dashboard/upload"), false, "Employee nav must NOT include upload");
    assert.equal(paths.length, 5);
});

// 4. Test isStaff / isEmployee checks across PM pages
function isStaffUser(roles) {
    return roles.includes("corob_employee") || roles.includes("admin");
}

test("Staff role check: admin and corob_employee can view all companies", () => {
    assert.equal(isStaffUser(["admin"]), true);
    assert.equal(isStaffUser(["corob_employee"]), true);
    assert.equal(isStaffUser(["customer"]), false);
});

