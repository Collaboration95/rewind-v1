import { RoutePlaceholder } from '../../components/RoutePlaceholder';
import { colors } from '../../components/tokens';

export default function ArchiveScreen() {
  return (
    <RoutePlaceholder
      accent={colors.paper}
      cardBody="The revealed local playlist stays closed until the simulated cycle reaches its reveal point."
      cardKicker="ARCHIVE / NOT YET"
      cardTestID="archive-placeholder"
      description="A place for the week after it becomes a memory."
      glyph="archive"
      screenTestID="screen-archive"
      title={'Let it\nreveal.'}
      titleTestID="archive-title"
    />
  );
}
