import styles from './home.module.css';

export default function StitchHome() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Stitch Playground</h1>
      <p className={styles.subtitle}>Paste the Stitch export here.</p>
    </main>
  );
}
