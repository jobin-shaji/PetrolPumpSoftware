const SectionCard = ({ title, description, children, actions }) => (
  <section className="section-card">
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="section-actions">{actions}</div> : null}
    </div>
    {children}
  </section>
);

export default SectionCard;
