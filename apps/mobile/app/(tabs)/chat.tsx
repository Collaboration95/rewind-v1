import { RoutePlaceholder } from '../../components/RoutePlaceholder';
import { colors } from '../../components/tokens';

export default function ChatScreen() {
  return (
    <RoutePlaceholder
      accent={colors.acid}
      cardBody="A local group thread will appear here once the seeded conversation slice is in place."
      cardKicker="CHAT / HELD LOCALLY"
      cardTestID="chat-placeholder"
      description="A small thread for the people inside the same capsule."
      glyph="chat"
      screenTestID="screen-chat"
      title={'Keep the\nthread.'}
      titleTestID="chat-title"
    />
  );
}
