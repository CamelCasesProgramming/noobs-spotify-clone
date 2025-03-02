import { useEffect, useState } from "react";
import Head from 'next/head';
import { Avatar } from '@material-ui/core';
import jwt from 'jsonwebtoken';
import SongContainer from "../components/SongContainer";
import axios from 'axios';
import router from "next/router";
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import swal from 'sweetalert';

export default function Album({ appContext }) {
    const { spotifyApi, user } = appContext;
	const [morning, noon, eve] = [['#8e8de5', '#121212'], ['#b96f29', '#121212'], ['#921212', '#121212']];

	const [colors, setColors] = useState([]);

    const [album, setAlbum] = useState('');
    const [tracks, setTracks] = useState('');
    const [infoMessage, setInfoMessage] = useState('Searching songs suiting your listening needs, this may take a few seconds, please wait...');

    useEffect(() => {
        if (localStorage.getItem('spotify_clone_token')) {
            spotifyApi.setAccessToken(jwt.verify(localStorage.getItem('spotify_clone_token'), 'access_token_spotify2'));

            let hours = new Date().getHours();

            if (hours >= 18) {
                setColors(eve);
            } else if (hours >= 12) {
                setColors(noon);
            } else {
                setColors(morning);
            }

            spotifyApi.getUserPlaylists(user.id)
            .then(async userPlaylists => {
                let playlistTracks = [];

                userPlaylists.items.map(async (playlist) => {
                    let playlistSongs = [];
                    let totalSongs = playlist.tracks.total;
                    let offset = 0;

                    while (totalSongs - offset > 100) {
                        let tracks = await spotifyApi.getPlaylistTracks(playlist.id, { limit: 100, offset });
                        
                        tracks = tracks.items.map(track => track.track.id);
                        let audioFeatures = await spotifyApi.getAudioFeaturesForTracks(tracks);

                        playlistSongs = playlistSongs.concat(audioFeatures.audio_features);
                        offset = offset + 100;
                    }

                    let newTracks = await spotifyApi.getPlaylistTracks(playlist.id, { limit: 100, offset });
                    newTracks = newTracks.items.map(track => track.track.id);
                    let newAudioFeatures = await spotifyApi.getAudioFeaturesForTracks(newTracks);
                    
                    playlistSongs = playlistSongs.concat(newAudioFeatures.audio_features);
                    playlistTracks.push([playlist.id, playlistSongs]);

                });

                // let likedTracks = await spotifyApi.getMyTopTracks({ limit: 50 });
                // let trackIds = likedTracks.items.map(track => track.id);
                // let likedFeatures = await spotifyApi.getAudioFeaturesForTracks(trackIds);

                // playlistTracks.push(['liked_ones', likedFeatures.audio_features]);


                setTimeout(() => {
                    axios.post(process.env.NEXT_PUBLIC_ML_SERVER + '/push-user-friendlies', playlistTracks)
                    .then(async res => {
                        if (res.data.status) {
                            let data = await spotifyApi.getTracks(res.data.recommendations);
                            setInfoMessage('');
                            setTracks(data.tracks);
                        
                        } else {
                            setInfoMessage(res.data.message);
                        }
                    })
                    .catch(() => setInfoMessage('Error occured while fetching data, you may consider to reload the page'));
                
                }, 5000);
                
            });

        } else {
            router.push('/');

        }

    }, []);

    const navStyles = {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		position: 'sticky',
		top: 0,
		backgroundColor: colors[0],
		paddingBlock: 15,
		paddingInline: 10,
		zIndex: 1,
	};

	const avatarStyles = {
		objectFit: 'contain',
		marginRight: 5,
		width: 25,
		height: 25,
	};

    return (
        <section className="dashboard">
            <Head>
                <title>Spotify - Your Library</title>
                <meta name="description" content="Get machine learning powered recommendations from us !" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
			<nav style={navStyles}>
				<p></p>

				<div className='dashboard_nav_button'>
					<Avatar src={user.images ? user.images[0]?.url : null} style={avatarStyles} />
					{user.display_name}
                    <InfoOutlinedIcon
						style={{marginLeft: 5}}
						onClick={() => {
							swal({
								icon: 'info',
								title: 'Info', 
								text: `
                                    Click on song's title to start/stop the youtube playback\n
                                    If songs arent playing on clicking their title, it is probably due to per day quota limit of youtube's playback
                                `,
								button: {text: '😑'}
							})
						}}
					/>
				</div>
			</nav>

            <header
                style={{
                    backgroundImage: `linear-gradient(${colors[0]}, ${colors[1]})`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}
                // className='dashboard_header'
            >
				<p
                    style={{
                        fontSize: '4.5vw',
                        margin: 50,
                    }}
                >
                        <b>Recommendations 💯</b>
                </p>

			</header><br /><br />

            {tracks && tracks.map(song => <SongContainer song={song} album={album} key={song.id} spotifyApi={spotifyApi} />)}
            {infoMessage && 
                <p style={{color: 'grey', fontSize: 16, marginLeft: 50}}>
                    {infoMessage}
                </p>
            }

        </section>
    );
}