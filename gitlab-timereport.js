const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
const fs = require("fs");
const { GraphQLClient, gql } = require('graphql-request')
const graphQlBase = "https://gitlab.com/api/graphql"
dayjs.extend(utc);
dayjs.extend(tz);

const argv = require('minimist')(process.argv.slice(2));

function getFormattedDateInTimezone(spentAt, timezone = "Europe/Brussels") {
  return dayjs(spentAt).tz(timezone).format("DD-MM-YYYY");
}

// https://stackoverflow.com/a/6313008
function formatTimeSpent(time) {
  let sec_num = parseInt(`${time}`, 10);
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - hours * 3600) / 60);

  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hours`;
  } else {
    return `${hours} hours and ${minutes} minutes`;
  }
}

const getTimeReport = async (projectId) => {
  const graphQLClient = new GraphQLClient(graphQlBase, { headers: { authorization: `Bearer ${process.env.GITLAB_TOKEN}` }})
  const query = gql`
  query ($projectId: ProjectID!, $after: String!) {
    timelogs(projectId: $projectId, first: 100, after: $after) {
      edges {
        node {
          issue {
            webUrl
            title
            labels {
              edges {
                node {
                  title
                }
              }
            }
          },
          timeSpent
          spentAt
          user {
            name
          }
          note {
            author {
              name
            }
            body
          }
        }
        cursor
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
  `
  let rvalue = []
  const variables = { projectId, after: "" }
  let data = await graphQLClient.request(query, variables)
  rvalue = [...rvalue, ...data.timelogs.edges]
  while(data.timelogs.pageInfo.hasNextPage) {
    console.log(`fetch one more page ${data.timelogs.pageInfo.endCursor}`)
    data = await graphQLClient.request(query, { ...variables, after: data.timelogs.pageInfo.endCursor })
    rvalue = [...rvalue, ...data.timelogs.edges]
  }
  return rvalue
}

const escapeCSV = (value) => {
  return `"${value}"`;
}

const createCSV = (projectName, data) => {
  const today = dayjs();
  const filename = `${projectName}-time-report-${today.format("YYYY-MM-DD")}.csv`;
  const csvHeader = "title\u0009url\u0009who\u0009note\u0009timeSpent\u0009timeSpentHuman\u0009spentAt\u0009labels\r\n";
  const dataStrings = data.map((node) => {
    const labels = node.issue.labels.edges.map(({ node }) => {
      return node.title;
    });
    return [
      escapeCSV(node.issue.title),
      escapeCSV(node.issue.webUrl),
      escapeCSV(node.user.name),
      escapeCSV(node.note ? node.note.body : ""),
      escapeCSV(node.timeSpent),
      escapeCSV(formatTimeSpent(node.timeSpent)),
      escapeCSV(getFormattedDateInTimezone(node.spentAt)),
      escapeCSV(labels),
    ].join("\u0009");
  });
  fs.writeFileSync(`${__dirname}/${filename}`, "\ufeff" + csvHeader + dataStrings.join("\r\n"), { encoding: "utf16le" });
  return filename;
}

const timeData = await getTimeReport(`gid://gitlab/Project/${argv.pid}`);
const filename = createCSV(argv.name, timeData.map(({ node }) => node));
console.log(`Report created: ${filename}`);