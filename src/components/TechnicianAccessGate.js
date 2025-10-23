const TechnicianAccessGate = ({ pageId, permissions = {}, features = {}, fallback, context = {} }) => {
    const feature = features[pageId] || features.default;
    if (!feature) {
        return typeof fallback === 'function' ? fallback({ pageId, permissions, context }) : null;
    }
    const { permission, render } = feature;
    if (permission && !permissions[permission]) {
        return typeof fallback === 'function' ? fallback({ pageId, permission, permissions, context }) : null;
    }
    return render({ ...context, permissions, pageId });
};

export default TechnicianAccessGate;
