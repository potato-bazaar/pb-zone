import React, { useMemo, useState } from 'react';
import { useQuizTelemetry } from '../../hooks/useQuizTelemetry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { formatNumber } from '../../lib/utils';

interface PlayersViewProps {
  searchQuery: string;
}

export const PlayersView: React.FC<PlayersViewProps> = ({ searchQuery }) => {
  const live = useQuizTelemetry(true);
  const [localSearch, setLocalSearch] = useState('');
  const query = (searchQuery || localSearch).trim().toLowerCase();

  const players = useMemo(() => {
    return live.data.players.filter((player) =>
      query ? player.playerName.toLowerCase().includes(query) || player.userId.toLowerCase().includes(query) : true,
    );
  }, [live.data.players, query]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Players</h1>
        <p className="text-sm text-muted-foreground">People who have played Quiz Time through PB Zone.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Players</CardTitle>
          <CardDescription>Live quiz leaderboard identities and scores.</CardDescription>
          {!searchQuery && (
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search players..."
              className="mt-2 h-10 max-w-sm rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Played</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {live.loading && players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading players…
                  </TableCell>
                </TableRow>
              ) : players.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {query ? `No players found matching "${query}"` : 'No players found'}
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player) => (
                  <TableRow key={`${player.userId}-${player.sessionId}-${player.rank}`}>
                    <TableCell>{player.rank}</TableCell>
                    <TableCell className="font-medium">{player.playerName}</TableCell>
                    <TableCell>{formatNumber(player.userPoints || player.sessionScore)}</TableCell>
                    <TableCell>
                      {player.correctCount}/{player.totalQuestions}
                    </TableCell>
                    <TableCell>
                      {player.completedAt
                        ? new Date(player.completedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
