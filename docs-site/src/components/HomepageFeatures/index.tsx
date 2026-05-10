import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'BambuStudio CLI Orchestration',
    description: (
      <>
        11 tools for slicing, arranging, orienting, and exporting models through
        the BambuStudio CLI. Auto-detects BambuStudio on macOS, Windows, and
        Linux.
      </>
    ),
  },
  {
    title: 'Mesh Geometry Engine',
    description: (
      <>
        manifold-3d WASM runs in-process inside Node.js — no Python, no
        subprocess overhead. Inspect, repair, scale, split, and add connectors
        to any manifold mesh.
      </>
    ),
  },
  {
    title: 'Workflow Automation',
    description: (
      <>
        End-to-end pipelines from STL to print-ready 3MF. Split oversized models,
        place dowel connectors at seams, and slice each part — all through a
        single AI conversation.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
